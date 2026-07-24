/**
 * OTR 回归测试 —— 跑法： node test/regress.js
 *
 * 为什么有这个文件：这一周反复出现"修了、以为好了、其实没好，要等用户真机玩才发现"。
 * 这里把【纯逻辑】的部分（日期解析、关键词识别、状态流转、生图服装）从真实源码里抠出来跑，
 * 几秒钟出结果。规则：
 *   1) 一律从 index.html / state.js 【真实源码】里提取被测函数，绝不在测试里抄一份副本
 *      （抄副本 = 源码改了测试还绿，等于没测）。
 *   2) 每修一个 bug，就在这里补一条会失败的用例，防止它第二次回来。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const STATE_SRC = fs.readFileSync(path.join(ROOT, 'state.js'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? '  → ' + detail : '')); }
}
function eq(name, got, want) {
  ok(name, String(got) === String(want), '得到 ' + JSON.stringify(got) + '，期望 ' + JSON.stringify(want));
}

/** 从 index.html 里按函数名抠出源码（配平大括号），保证测的是线上那份 */
function extractFn(name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = HTML.match(re);
  if (!m) throw new Error('源码里找不到函数 ' + name + '（改名了？测试要同步更新）');
  const start = HTML.indexOf(m[0]);
  let i = HTML.indexOf('{', start), depth = 0;
  for (; i < HTML.length; i++) {
    if (HTML[i] === '{') depth++;
    else if (HTML[i] === '}') { depth--; if (depth === 0) break; }
  }
  return HTML.slice(start, i + 1);
}
/** 从 index.html 里抠出一个 const/let 常量声明（单行） */
function extractConst(name) {
  const m = HTML.match(new RegExp('^\\s*(?:const|let|var)\\s+' + name + '\\s*=.*$', 'm'));
  if (!m) throw new Error('源码里找不到常量 ' + name);
  return m[0].trim().replace(/^(const|let|var)\s+/, 'var ');
}

// ══════════════════════════════════════════════════════
// ① 日期解析 dateOffsetFromText —— 改期失效的真凶就出在这
// ══════════════════════════════════════════════════════
(function testDateOffset() {
  const sandbox = {
    // 复刻锚点：rtStartDate=2026-07-23 → day1=7/23，day2=7/24（用户实测那份存档）
    _ANCHOR: new Date(2026, 6, 23), _GDAY: 1,
  };
  const code = `
    function getCalDateStr(g){var d=new Date(_ANCHOR);d.setDate(_ANCHOR.getDate()+g-_GDAY);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
    ${extractFn('dateOffsetFromText')}
    module.exports = { dateOffsetFromText, getCalDateStr };
  `;
  const m = { exports: {} };
  new Function('module', '_ANCHOR', '_GDAY', code)(m, sandbox._ANCHOR, sandbox._GDAY);
  const { dateOffsetFromText, getCalDateStr } = m.exports;
  const today = 2; // 2026-07-24
  const at = (txt) => { const o = dateOffsetFromText(txt, today); return o == null ? null : getCalDateStr(today + o); };

  eq('日期·今天(24日)不能算成下个月', at('24日2点的录音，帮我改到早上9点'), '2026-07-24');
  eq('日期·明天(25日)', at('帮我把25日的杂志拍摄改成14点'), '2026-07-25');
  eq('日期·跨月(8月1日)', at('8月1日一起喝咖啡，怎么样'), '2026-08-01');
  eq('日期·带月份优先(7月31日)', at('7月31日那天呢'), '2026-07-31');
  eq('日期·没有日期时返回 null', at('明天下午有空吗'), null);
})();

// ══════════════════════════════════════════════════════
// ② 自由输入的"发起亲密"识别 —— 只认明确升级，日常亲昵不能误触发
// ══════════════════════════════════════════════════════
(function testEscalate() {
  const m = { exports: {} };
  new Function('module', extractConst('_vnEscalateKw') + '\nmodule.exports={kw:_vnEscalateKw};')(m);
  const kw = m.exports.kw;
  ['脱掉衣服', '我脱掉了他的衬衫', '坐在他身上', '跨坐在他腿上', '解开他的扣子',
    '我想要你', '抱我去床上', '舌吻他'].forEach(s =>
    ok('挑逗·应触发：' + s, kw.test(s)));
  ['抱住他', '靠在他肩上', '牵他的手', '亲了他一下脸颊', '今天穿了新衣服',
    '我们去看电影吧', '他脱了鞋', '帮我拿件外套'].forEach(s =>
    ok('挑逗·不该触发：' + s, !kw.test(s)));
})();

// ══════════════════════════════════════════════════════
// ③ 生图服装：同居居家版必须换掉工作装，且【绝不出现否定词】
//    （flux 对否定无效甚至反向诱导——"no suit" 反而更容易画出西装，踩过三次）
// ══════════════════════════════════════════════════════
(function testHomeOutfit() {
  global.STORY = {
    characters: { agent: { age: 32 }, drummer: { age: 26 }, actor: { age: 29 }, butler: { age: 20 }, rival: { age: 30 }, detective: { age: 36 } },
    utils: { getCharacterEmotionalState: () => 'warm' },
  };
  const m = { exports: {} };
  new Function('module', 'STORY', STATE_SRC + '\nmodule.exports={STATE:STATE};')(m, global.STORY);
  const S = m.exports.STATE;

  ok('居家便装·不含否定词(no suit/no jacket 会反向诱导)',
    !/\bno\s+(suit|jacket|tie)\b|\bnot\s+wearing\b/i.test(S.imagePrompts.HOME_OUTFIT),
    S.imagePrompts.HOME_OUTFIT);

  const builders = {
    agent: 'buildAgentPrompt', drummer: 'buildDrummerPrompt', actor: 'buildActorPrompt',
    butler: 'buildButlerPrompt', rival: 'buildRivalPrompt', detective: 'buildDetectivePrompt',
  };
  Object.keys(builders).forEach(k => {
    const G = { npcs: { [k]: { origin: 'American', hairColor: null } } };
    const work = S.imagePrompts[builders[k]](G, 'scene', 50);
    G.npcs[k]._wearHome = true;
    const home = S.imagePrompts[builders[k]](G, 'scene', 50);
    ok('居家便装·' + k + ' 换成了便装', /loungewear/i.test(home));
    ok('居家便装·' + k + ' 不残留工作装',
      !/\bsuit\b|\bjacket\b|polo work shirt|band tee|dress shirt|earpiece/i.test(home),
      (home.match(/\bsuit\b|\bjacket\b|polo work shirt|band tee|dress shirt|earpiece/i) || [''])[0]);
    ok('居家便装·' + k + ' 工作版仍是工作装', work !== home);
  });
})();

// ══════════════════════════════════════════════════════
// ④ 日历越界清扫：窗口必须包含正常游戏期（游戏总长360天），别误杀真行程
// ══════════════════════════════════════════════════════
(function testGhostWindow() {
  global.STORY = global.STORY || { characters: {}, utils: { getCharacterEmotionalState: () => '' } };
  const m = { exports: {} };
  new Function('module', 'STORY', STATE_SRC + '\nmodule.exports={STATE:STATE};')(m, global.STORY);
  const S = m.exports.STATE;
  S.data.rtStartDate = '2026-07-23';
  S.data.calendar = { events: {
    '2026-07-24': [{ id: 'work_2' }],
    '2026-12-31': [{ id: 'late_but_valid' }],   // 游戏第161天左右，必须留
    '2027-07-20': [{ id: 'day360ish' }],        // 接近第360天，必须留
    '2028-12-14': [{ id: 'ghost' }],            // 真幽灵，该删
    'not-a-date': [{ id: 'junk' }],             // 垃圾键，该删
  } };
  S.save._stripGhostEvents();
  const left = Object.keys(S.data.calendar.events).sort();
  ok('日历清扫·保住第1天', left.includes('2026-07-24'));
  ok('日历清扫·保住年底行程', left.includes('2026-12-31'));
  ok('日历清扫·保住接近第360天的行程', left.includes('2027-07-20'), '剩下：' + left.join(','));
  ok('日历清扫·删掉真幽灵', !left.includes('2028-12-14'));
  ok('日历清扫·删掉垃圾键', !left.includes('not-a-date'));
})();

// ══════════════════════════════════════════════════════
// ④b 老档日历迁移【绝不能碰实时存档】
//    真实事故：这段本是给"固定起始日 2024-03-01 的老档"写的一次性迁移，判据是 k < '2027-'。
//    实时锚点 2026-07-23 一来，所有【正确的】2026 键都满足该条件 → 2026-07-24 被当成第876天
//    搬到 2028-12-14 并 delete 原件 → 再被幽灵清扫删掉 → 玩家改的行程整个蒸发。
// ══════════════════════════════════════════════════════
(function testCalendarMigration() {
  const code = `
    ${extractFn('migrateCalendarDates')}
    module.exports = migrateCalendarDates;
  `;
  const mk = (rtStartDate, keys) => {
    const G = { rtStartDate, calendar: { events: {} } };
    keys.forEach(k => { G.calendar.events[k] = [{ id: 'e_' + k }]; });
    const STATE = { save: { saveGame() {} } };
    const getCalDateStr = (gameDay) => {
      const base = new Date(2026, 6, 23);
      const d = new Date(base); d.setDate(base.getDate() + gameDay - 1);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };
    const m = { exports: {} };
    new Function('module', 'G', 'STATE', 'getCalDateStr', code)(m, G, STATE, getCalDateStr);
    m.exports();
    return Object.keys(G.calendar.events).sort();
  };

  // ① 实时存档（有锚点）：正确的 2026 日期必须原封不动
  const rt = mk('2026-07-23', ['2026-07-24', '2026-07-25', '2026-07-29']);
  ok('日历迁移·实时存档的 2026 行程不被搬走', rt.join(',') === '2026-07-24,2026-07-25,2026-07-29', '变成了 ' + rt.join(','));
  ok('日历迁移·实时存档不产生 2028 幽灵', !rt.some(k => k.startsWith('2028')), rt.join(','));

  // ② 真·老档（无锚点、2024 起始）：仍应正常迁移走
  const legacy = mk(undefined, ['2024-03-02', '2024-03-05']);
  ok('日历迁移·真老档仍会被迁移', !legacy.some(k => k.startsWith('2024')), '剩下 ' + legacy.join(','));
})();

// ══════════════════════════════════════════════════════
// ④c 日历唯一写入口 calAddEvent 的优先级规则
//    一天只留一份工作（修"舞蹈体能训练"和"录音室排练"都排 14:00-17:00 完全重叠），
//    但【剧情工作】必须能把自动排的通用行程挤走——否则 Day2 第一次见制作人的排练会被静默吞掉；
//    玩家手改过的(_userSet)则永远不让位。
// ══════════════════════════════════════════════════════
(function testCalAddEventPriority() {
  const code = `
    ${extractFn('calAddEvent')}
    module.exports = calAddEvent;
  `;
  const run = (existing, incoming) => {
    const G = { rtStartDate: '2026-07-23', calendar: { events: { '2026-07-24': existing.slice() } } };
    const STATE = { save: { saveGame() {} } };
    const m = { exports: {} };
    new Function('module', 'G', 'STATE', 'refreshCalBadge', 'eventsTimeConflict', 'REALTIME', code)(
      m, G, STATE, () => {}, () => false, true);
    m.exports('2026-07-24', incoming);
    return G.calendar.events['2026-07-24'].map(e => e.id);
  };
  const mandate = { id: 'mandate_2', type: 'work', status: 'accepted', source: 'agent_mandate', title: '舞蹈体能训练' };
  const rehearsal = { id: 'work_2', type: 'work', status: 'accepted', npcKey: 'drummer', title: '录音室排练' };

  ok('日历·剧情排练能把自动排的行程挤走',
    run([mandate], rehearsal).join(',') === 'work_2', run([mandate], rehearsal).join(','));
  ok('日历·不会一天出现两份工作',
    run([mandate], rehearsal).length === 1);
  ok('日历·自动排班不会顶掉已有的剧情工作',
    run([rehearsal], mandate).join(',') === 'work_2', run([rehearsal], mandate).join(','));
  ok('日历·玩家手改过的行程绝不让位',
    run([Object.assign({}, mandate, { _userSet: true })], rehearsal).join(',') === 'mandate_2',
    run([Object.assign({}, mandate, { _userSet: true })], rehearsal).join(','));
  ok('日历·越界年份的日期键被拒绝写入', (() => {
    const G = { rtStartDate: '2026-07-23', calendar: { events: {} } };
    const STATE = { save: { saveGame() {} } };
    const m = { exports: {} };
    new Function('module', 'G', 'STATE', 'refreshCalBadge', 'eventsTimeConflict', 'REALTIME', code)(
      m, G, STATE, () => {}, () => false, true);
    m.exports('2028-12-14', { id: 'ghost', type: 'work', status: 'accepted' });
    return Object.keys(G.calendar.events).length === 0;
  })());
})();

// ══════════════════════════════════════════════════════
// ⑤ HTML 标签没闭合 —— node --check 抓不到（JS 是好的，坏的是 HTML）
//    实际踩过：<div class="vn-dialog" style="..."  少了 '>'，浏览器把下一个 <div ...> 整个
//    当成属性吃掉 → 对话底板只裹住说话人、正文被甩到面板外贴在图上，且点击穿透到背景。
// ══════════════════════════════════════════════════════
(function testUnclosedTags() {
  // 只看标签【开头】到下一个 < 之间有没有 >：属性区里冒出 < 基本就是漏了 >
  const bad = [];
  const re = /<(div|span|button|p|section|label|form)\b([^<>]*)</g;
  let m;
  while ((m = re.exec(HTML))) {
    const attrs = m[2];
    // 属性值里合法出现的 < 很罕见；排除注释与明显的字符串内比较
    if (/=\s*"[^"]*$/.test(attrs)) continue; // 落在未闭合的引号里 → 属于属性值，跳过
    const line = HTML.slice(0, m.index).split('\n').length;
    bad.push('第 ' + line + ' 行: <' + m[1] + m[2].slice(0, 60).replace(/\s+/g, ' '));
  }
  ok('HTML·没有漏写 > 的开标签', bad.length === 0, bad.join(' ;; '));
})();

// ══════════════════════════════════════════════════════
// ⑥ 版本号一致性：5处必须同步（漏一处=用户吃到缓存旧代码，最容易复发）
// ══════════════════════════════════════════════════════
(function testVersions() {
  const vs = [];
  const reAll = /v(?:=|)(\d+\.\d+)/g;
  const lines = HTML.split('\n');
  [/<script src="story\.js\?v=([\d.]+)"/, /<script src="state\.js\?v=([\d.]+)"/].forEach(re => {
    const m = HTML.match(re); if (m) vs.push(m[1]);
  });
  lines.forEach(l => {
    let m = l.match(/id="ver-tag"[^>]*>v([\d.]+)/) || l.match(/id="ver-tag-settings"[^>]*>Off the Record · v([\d.]+)/)
      || l.match(/innerHTML = 'v([\d.]+) · <span/);
    if (m) vs.push(m[1]);
  });
  ok('版本号·5处都找得到', vs.length === 5, '只找到 ' + vs.length + ' 处: ' + vs.join(','));
  ok('版本号·完全一致', new Set(vs).size === 1, vs.join(' / '));
})();

// ══════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
  console.log('✅ 全部通过（' + pass + ' 项）');
} else {
  console.log('❌ ' + fail + ' 项失败 / 共 ' + (pass + fail) + ' 项\n');
  failures.forEach(f => console.log('   ✗ ' + f));
}
process.exit(fail === 0 ? 0 : 1);
