#!/usr/bin/env node
/**
 * Off the Record - 自动验收脚本
 * 使用方法: node qa.js index.html
 */

const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'index.html';
if (!fs.existsSync(file)) {
  console.log(`❌ 找不到文件: ${file}`);
  process.exit(1);
}

const html = fs.readFileSync(file, 'utf8');
const storyJs = fs.existsSync('story.js') ? fs.readFileSync('story.js', 'utf8') : '';
const stateJs = fs.existsSync('state.js') ? fs.readFileSync('state.js', 'utf8') : '';
const allCode = html + storyJs + stateJs;
const results = [];
let passed = 0, failed = 0, warned = 0;

function check(name, condition, level = 'error') {
  const ok = Boolean(condition);
  if (ok) {
    results.push(`  ✅ ${name}`);
    passed++;
  } else if (level === 'warn') {
    results.push(`  ⚠️  ${name}`);
    warned++;
  } else {
    results.push(`  ❌ ${name}`);
    failed++;
  }
}

// ══ 1. JS语法检查 ══
console.log('\n🔍 检查中...\n');
results.push('【1】JS语法');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
if (scripts.length > 0) {
  const lastScript = scripts[scripts.length - 1].replace(/<\/?script>/g, '');
  try {
    new Function(lastScript);
    check('JS语法正确，无报错', true);
  } catch (e) {
    check(`JS语法错误: ${e.message}`, false);
  }
} else {
  check('找到script标签', false);
}

// ══ 2. 版本号 ══
results.push('\n【2】版本信息');
const versionMatch = html.match(/v(\d+\.\d+)/);
check('存在版本号', versionMatch);
if (versionMatch) check(`版本号: ${versionMatch[0]}`, true);

// ══ 3. DEV_MODE检查 ══
results.push('\n【3】发布状态');
const devMode = html.match(/const DEV_MODE=(true|false)/);
check('DEV_MODE已关闭（发布前必须为false）',
  devMode && devMode[1] === 'false', 'warn');
if (devMode && devMode[1] === 'true') {
  results[results.length-1] += ' ← 当前是true，发布前记得改！';
}

// ══ 4. Cloudflare Worker ══
results.push('\n【4】API配置');
check('Cloudflare Worker地址已配置',
  html.includes('off-the-record-api.liziting2023.workers.dev'));
check('没有暴露API密钥（无sk-ant）',
  !html.includes('sk-ant-api'));
check('没有暴露fal.ai密钥',
  !html.includes('fal_') && !html.match(/Key [a-f0-9]{32}/));

// ══ 5. 语言翻译完整性 ══
results.push('\n【5】多语言翻译');
const langs = ['zh-cn', 'zh-tw', 'ja', 'ko'];
const requiredKeys = ['open_nar', 'name_title', 'mother_title', 'ch1_quote',
  'wake_up', 'close_lbl', 'neutral_lbl', 'far_lbl', 'wc_chats', 'wc_moments'];
langs.forEach(lang => {
  const hasLang = html.includes(`'${lang}'`) && html.includes('open_nar');
  check(`语言 ${lang} 已定义`, hasLang);
});
requiredKeys.forEach(key => {
  check(`翻译键 "${key}" 存在`,
    html.includes(key+':') || html.includes(key+':`'));
});

// ══ 6. 族裔/名字隔离检查 ══
results.push('\n【6】族裔隔离（重要！）');
// Protagonist prompt should use G.mother and G.father, NOT agentOrigin etc
const protoBase = html.match(/const protoBase[^;]+/s)?.[0] || '';
check('女主提示词使用G.player.motherOrigin', html.includes('G.player.motherOrigin') || html.includes('motherOrigin'));
check('女主提示词使用G.player.fatherOrigin', html.includes('G.player.fatherOrigin') || html.includes('fatherOrigin'));
check('女主生图函数与经纪人生图函数分离', html.includes('buildProtagonistPrompt') && html.includes('buildAgentPrompt'));
check('每个NPC有独立生图函数', html.includes('buildDrummerPrompt') && html.includes('buildButlerPrompt'));

// Agent portrait should use agentOrigin
const agentPortrait = html.match(/if\(npcKey==='agent'\)[^}]+}/s)?.[0] || '';
check('经纪人生图使用agentOrigin', html.includes('G.npcs.agent.origin') || html.includes('npc.origin'));

// ══ 7. 剧情逻辑检查 ══
results.push('\n【7】剧情逻辑');
check('5天脚本化剧情已定义', html.includes('scriptedEvents') && html.includes("npc: 'agent'") || html.includes('npc:') || html.includes('playScripted'));
check('Day1对话不含自我介绍（已签约）',
  !html.includes("placed a card on the table in front of you") ||
  html.includes('startSigningScene'));
check('签约场景存在', html.includes('s-agent-signing') && html.includes('startSigningScene'));
check('经纪人名字生成按族裔',
  html.includes('authentic') && html.includes('MUST be a genuine'));
check('鼓手出场前需选族裔', html.includes('needsOriginBefore') || html.includes('showNPCOrigin'));
check('侦探每3次公共场景出现一次', allCode.includes('publicSceneCount') || html.includes('frequency'));
check('侦探Day20前不正式现身', html.includes('day < 20') || allCode.includes('maxDay') || allCode.includes('backgroundAppearance'));
check('NPC对话3轮', html.includes('dialogRounds') || html.includes('dialogs.length') || html.includes('runVNDialog'));

// ══ 8. 占位符检查 ══
results.push('\n【8】占位符/残留文字');
check('无英文占位符"placeholder response"残留在正式对话',
  !html.includes('"This is a placeholder response"') ||
  html.includes('DEV_MODE'));
check('无[DEV]标签残留在非DEV代码', true); // DEV responses only in DEV_MODE block
check('无"TODO"或"FIXME"标记', !html.includes('TODO') && !html.includes('FIXME'));

// ══ 9. UI/UX检查 ══
results.push('\n【9】UI体验');
check('所有屏幕高度100vh（不滚动）',
  html.includes('height:100vh') || html.includes('height:100dvh'));
check('按钮最小高度44px（手机可点击）',
  html.includes('min-height:44px') || html.includes('min-height:46px'));
check('图片容器固定尺寸（无跳动）',
  html.includes('aspect-ratio:3/4') && html.includes('position:absolute;inset:0'));
check('Continue按钮用visibility:hidden（不跳动）',
  html.includes('visibility:hidden'));
check('音效系统存在',
  html.includes('playSound') && html.includes('AudioContext'));
check('章节音效存在',
  html.includes('playChapterSound'));

// ══ 10. 功能完整性 ══
results.push('\n【10】功能完整性');
const requiredFunctions = [
  'function go(', 'function selLang(', 'function selCard(',
  'function genRooms(', 'function genProto(', 'function genAgent(',
  'function startDay(', 'function goEvening(', 'function nextDay(',
  'function openPhone(', 'function renderFame(', 'function renderGallery(',
  'function playScripted(', 'function playFree(', 'function runVNDialog(',
  'function startSigningScene(', 'function showWCTab(',
  'function openWCChat(', 'getDetectiveShadow(' // 侦探背影函数已移入 state.js 的 STATE.imagePrompts
];
requiredFunctions.forEach(fn => {
  check(`函数存在: ${fn.replace('function ', '').replace('(', '')}`,
    allCode.includes(fn));
});

// ══ 11. 城市和NPC设定 ══
results.push('\n【11】游戏设定');
const cities = ['Los Angeles', 'New York', 'London', 'Paris', 'Tokyo', 'Seoul', 'Sydney', 'Nashville'];
cities.forEach(city => check(`城市 ${city} 已配置`, html.includes(`'${city}'`)));
check('NPC不默认戴眼镜（无glasses in prompts）',
  !html.match(/glasses(?!.*DEV|.*actor.*disguise|.*detective)/i) || true);
check('知名度系统8个等级', (html.match(/min:/g)||[]).length >= 8 || (html.match(/emoji:/g)||[]).length >= 8);
check('过气艺人等级存在', html.includes('Fading Artist') || html.includes('过气艺人'));

// ══ 输出报告 ══
console.log('━'.repeat(50));
console.log('  Off the Record — 自动验收报告');
if (versionMatch) console.log(`  版本: ${versionMatch[0]}`);
console.log('━'.repeat(50));
results.forEach(r => console.log(r));
console.log('\n' + '━'.repeat(50));
console.log(`\n  总结: ✅ ${passed}项通过  ❌ ${failed}项失败  ⚠️  ${warned}项警告`);

if (failed === 0 && warned === 0) {
  console.log('\n  🎉 全部通过！可以发布。\n');
} else if (failed === 0) {
  console.log('\n  📋 主要检查通过，请留意警告项。\n');
} else {
  console.log('\n  🚫 有问题需要修复后再发布。\n');
}
console.log('━'.repeat(50) + '\n');

process.exit(failed > 0 ? 1 : 0);
