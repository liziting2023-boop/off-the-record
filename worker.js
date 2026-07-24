// ══════════════════════════════════════════════════════════════════
// Cloudflare Worker: off-the-record-api.liziting2023.workers.dev
// 这份是【备份/版本管理】用的源码副本，真正运行的是 Cloudflare 后台里的代码。
// 改这里不会自动部署——修改后需在 Cloudflare 后台 (Workers & Pages → off-the-record-api
// → Edit code) 粘贴并 Deploy，两边保持一致。
//
// 环境变量（Cloudflare 后台配置，不在代码里）：
//   ANTHROPIC_KEY  — Anthropic API key（/claude）
//   FAL_KEY        — fal.ai key（/image）
//   OTR_KV         — KV 绑定（额度计数 + 云存档），id b8fb10bd006c4a7991933606514f19f6
//
// 路由：/claude → Anthropic messages；/image → fal.ai；/save → 云存档(GET/PUT，按设备ID)
//
// 关键设计（2026-07 更新）：
//   · 上游偶发返回 403 {"error":{"type":"forbidden","message":"Request not allowed"}} / 429 / 5xx
//     （请求打得密时更易撞），callAnthropic() 在【服务端】退避重试最多4次消化掉它——
//     比客户端重试更省额度（额度只 bump 一次），也更靠近上游。
//   · /claude、/image 透传上游真实 HTTP 状态码（不再一律 200），客户端才能区分 限流/额度满/成功。
// ══════════════════════════════════════════════════════════════════

const ALLOWED_ORIGIN = 'https://liziting2023-boop.github.io';

function cors(extra = {}) {
  return Object.assign({
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
  }, extra);
}

// 每设备每日限额 + 全局日上限（防止 Worker 地址被抓包后刷爆账单）
// 2026-07-24：发放封测账号，已把开发期临时上调的上限【调回封测值】（device 400/150、global 5000/2000）。
// 开发期临时上调过（device 2000/800、global 15000/8000）——若作者后续要再高强度自测可临时改高，测完记得改回。
const LIMITS = {
  device: { claude: 400, image: 150 },
  global: { claude: 5000, image: 2000 },
};

async function bumpQuota(env, kind, did) {
  const day = new Date().toISOString().slice(0, 10);
  const dKey = 'q:' + day + ':' + did + ':' + kind;
  const gKey = 'g:' + day + ':' + kind;
  const [dRaw, gRaw] = await Promise.all([env.OTR_KV.get(dKey), env.OTR_KV.get(gKey)]);
  const dCount = parseInt(dRaw || '0', 10);
  const gCount = parseInt(gRaw || '0', 10);
  if (dCount >= LIMITS.device[kind] || gCount >= LIMITS.global[kind]) return false;
  await Promise.all([
    env.OTR_KV.put(dKey, String(dCount + 1), { expirationTtl: 172800 }),
    env.OTR_KV.put(gKey, String(gCount + 1), { expirationTtl: 172800 }),
  ]);
  return true;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 调用 Anthropic：对上游"瞬时错误"（403 封锁 / 429 / 408 / 5xx / 空体）退避重试。
// 只在这里重试——额度在外面已只 bump 一次，重试不会重复扣额度。明确的参数错误(400等)不重试。
async function callAnthropic(env, body) {
  let last = { status: 502, json: { error: { type: 'upstream_error', message: 'no response' } } };
  for (let i = 0; i < 4; i++) {
    let resp;
    try {
      resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      last = { status: 502, json: { error: { type: 'proxy_error', message: String(e) } } };
      if (i < 3) { await sleep(400 * (i + 1)); continue; }
      return last;
    }
    let j = null;
    try { j = await resp.json(); } catch (e) { j = null; }
    if (resp.ok && j && j.content) return { status: 200, json: j }; // 成功
    last = { status: resp.status || 502, json: j || { error: { type: 'upstream_error', message: 'empty body' } } };
    const transient = resp.status === 403 || resp.status === 429 || resp.status === 408 || resp.status >= 500 || !j;
    if (transient && i < 3) { await sleep(400 * (i + 1)); continue; }
    return last; // 非瞬时错误：不重试直接返回
  }
  return last;
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
          'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id',
        }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    // 匿名设备ID（客户端生成并持久化）；老版本没带的话按IP兜底限额
    const did = ((request.headers.get('X-Device-Id') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64))
      || ('ip:' + (request.headers.get('CF-Connecting-IP') || 'unknown'));

    // Claude API proxy
    if (path === '/claude') {
      if (!(await bumpQuota(env, 'claude', did))) {
        return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429, headers: cors() });
      }
      const body = await request.json();
      // 模型白名单：只允许这两个，防止接口被抓包后乱调贵模型；不认识的一律回落 sonnet
      const ALLOWED_MODELS = ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
      body.model = ALLOWED_MODELS.includes(body.model) ? body.model : 'claude-sonnet-4-6';
      // max_tokens 封顶，防止被刷超长输出
      body.max_tokens = Math.min(Math.max(parseInt(body.max_tokens) || 800, 1), 1024);
      const out = await callAnthropic(env, body);
      return new Response(JSON.stringify(out.json), { status: out.status, headers: cors() });
    }

    // fal.ai image generation proxy
    if (path === '/image') {
      if (!(await bumpQuota(env, 'image', did))) {
        return new Response(JSON.stringify({ error: 'quota_exceeded' }), { status: 429, headers: cors() });
      }
      const body = await request.json();
      // 模型白名单：游戏可传 model 字段选择模型，不认识的一律回落到 schnell
      const ALLOWED_MODELS = ['fal-ai/flux/schnell', 'fal-ai/flux/dev'];
      const model = ALLOWED_MODELS.includes(body.model) ? body.model : 'fal-ai/flux/schnell';
      delete body.model; // 不把这个字段转发给 fal
      const response = await fetch('https://fal.run/' + model, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Key ' + env.FAL_KEY,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), { status: response.status, headers: cors() });
    }

    // AI内容举报（上架合规·Google Play AI生成内容政策要求）：留档KV，开发者用 dashboard 查 report: 前缀键核查。
    // 每设备限频（复用 bumpQuota 的 claude 计数就够，不单独开表）；正文截断防刷。
    if (path === '/report' && request.method === 'POST') {
      try {
        const body = await request.json();
        const rec = {
          did: did,
          npc: String(body.npc || '').slice(0, 24),
          text: String(body.text || '').slice(0, 500),
          day: parseInt(body.day) || 0,
          ts: Date.now(),
        };
        // 键含时间戳避免覆盖；保留60天足够核查
        await env.OTR_KV.put('report:' + new Date().toISOString().slice(0, 10) + ':' + did + ':' + rec.ts, JSON.stringify(rec), { expirationTtl: 60 * 86400 });
      } catch (e) {}
      return new Response(JSON.stringify({ ok: true }), { headers: cors() });
    }

    // 云存档：按设备ID存取（匿名；上架后可升级为绑定账号）
    if (path === '/save') {
      const key = 'save:' + did;
      if (request.method === 'GET') {
        const data = await env.OTR_KV.get(key);
        return new Response(data || 'null', { headers: cors() });
      }
      if (request.method === 'PUT') {
        const text = await request.text();
        if (text.length > 400000) {
          return new Response(JSON.stringify({ error: 'too_large' }), { status: 413, headers: cors() });
        }
        // 存档摘要写进 KV metadata（list 时免费带出）→ /admin 面板零成本展示测试者进度
        let meta = null;
        try {
          const s = JSON.parse(text);
          const npcs = {};
          Object.keys(s.npcs || {}).forEach(k => {
            const n = s.npcs[k];
            if (n && n.met) npcs[k] = [n.relationship | 0, n.nights | 0];
          });
          meta = { tc: String(s._testerCode || '').slice(0, 12), n: String((s.player || {}).name || '').slice(0, 20), d: s.day | 0, ts: Date.now(), npc: npcs };
          if (JSON.stringify(meta).length > 900) meta.npc = {}; // KV metadata 上限1KB，超了就丢好感明细保核心字段
        } catch (e) {}
        await env.OTR_KV.put(key, text, meta ? { metadata: meta } : undefined);
        return new Response(JSON.stringify({ ok: true }), { headers: cors() });
      }
    }

    // ── 测试者进度面板（封测期）：/admin?key=ADMIN_KEY → HTML表格 ──
    // 展示每份云存档的：测试码/角色名/游戏天数/最后活跃/各NPC好感(·n=性行为次数)。
    // 数据来自 /save PUT 时写的 metadata——部署后测试者下一次存档起才有数据。
    if (path === '/admin') {
      if (!env.ADMIN_KEY || url.searchParams.get('key') !== env.ADMIN_KEY) {
        return new Response('forbidden', { status: 403 });
      }
      const list = await env.OTR_KV.list({ prefix: 'save:', limit: 1000 });
      const rows = list.keys
        .map(k => Object.assign({ id: k.name.slice(5, 13) }, k.metadata || {}))
        .sort((a, b) => (b.ts || 0) - (a.ts || 0));
      const NPC_LABELS = { agent: 'Agent', drummer: 'Drummer', actor: 'Actor', detective: 'Detective', butler: 'Butler', rival: 'Rival', coffee: 'Barista', clerk: 'Clerk', trainer: 'Trainer', engineer: 'Engineer', runner: 'Runner', photog: 'Photog' };
      const esc = t => String(t == null ? '' : t).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
      const trs = rows.map(r => {
        const npcCells = Object.keys(r.npc || {}).map(k =>
          esc(NPC_LABELS[k] || k) + ' <b>' + esc((r.npc[k] || [])[0]) + '</b>' + (((r.npc[k] || [])[1] | 0) > 0 ? ' 🌙' + esc(r.npc[k][1]) : '')
        ).join(' · ');
        const when = r.ts ? new Date(r.ts).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : '—';
        return '<tr><td>' + esc(r.tc || '—') + '</td><td>' + esc(r.n || '—') + '</td><td>' + esc(r.d || '—') + '</td><td>' + when + '</td><td style="font-size:12px">' + (npcCells || '—') + '</td><td style="color:#999;font-size:11px">' + esc(r.id) + '</td></tr>';
      }).join('');
      const html = '<!doctype html><meta charset="utf-8"><title>OTR Testers</title><style>body{font-family:system-ui;margin:24px;background:#fdf6f8}h1{font-size:18px}table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #eed7de;padding:8px 10px;text-align:left;font-size:13px;vertical-align:top}th{background:#f7e3ea}</style>' +
        '<h1>Off the Record — Testers (' + rows.length + ')</h1>' +
        '<table><tr><th>Code</th><th>Name</th><th>Day</th><th>Last active</th><th>Affection (🌙=nights)</th><th>Device</th></tr>' + trs + '</table>';
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return new Response('Not found', { status: 404 });
  }
};
