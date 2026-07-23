/**
 * OFF THE RECORD - Game State Manager
 * 游戏状态管理文件
 *
 * 负责：
 * 1. 玩家所有设定（族裔、城市、外形）
 * 2. 每个NPC的记忆（发生过什么）
 * 3. 剧情事件追踪
 * 4. 关系值管理
 * 5. 图片生成提示词构建（严格族裔隔离）
 */

const STATE = {

  // ══════════════════════════════════════════════════════
  // 游戏状态（默认值）
  // ══════════════════════════════════════════════════════
  data: {
    // 语言
    lang: 'en',
    langName: 'English',

    // 图片风格（用户试用 photorealistic=真实摄影风 中；不喜欢再改回其它——老档迁移见 index.html 启动自愈）
    imgStyle: 'photorealistic',
    // 人物图高质量模式：true=人物立绘用 fal-ai/flux/dev（更听话更精细），背景仍用 schnell 省钱
    // 需要 Cloudflare Worker 支持 model 字段；Worker 未更新时该字段被忽略，安全向后兼容
    hqPortraits: true,  // 人物立绘/头像默认走 flux/dev（画质/解剖服从度高，修schnell崩坏）；背景仍schnell省钱

    // 音效
    soundOn: true,

    // 游戏进度
    day: 1,
    fame: 5,
    stress: 0,     // 压力值0-100：工作+12/职业投资+8/剧情日+5，休息-15（周末-20），满100次日病倒
    sick: null,    // 生病状态 { start: 病倒那天的day }，持续3天强制休养，知名度-8，NPC轮流探望
    daysWithoutWork: 0,
    publicSceneCount: 0, // 侦探出现计数
    today: null, // 今天做了什么（{label, isWork, npc}），供晚间消息等引用，每天开始时重置
    scriptedDone: {}, // 剧情固定日完成标记（{day: true}）：没玩到的剧情会自动顺延到下一天（方案A补见机制）

    // 玩家设定（与NPC完全独立）
    player: {
      name: '',
      motherOrigin: null,   // 用于女主生图
      fatherOrigin: null,   // 用于女主生图
      motherEyes: null,     // 从族裔数据推导
      fatherSkin: null,     // 从族裔数据推导
      hairStyle: null,
      hairColor: null,
      city: null,
      decor: null,
      portraitUrl: null,
      portraitSeed: null,   // 生图种子，后续所有场景复用以保持形象一致
    },

    // 公寓
    apartment: {
      livingDayUrl: null,
      livingNightUrl: null,
      bedroomNightUrl: null,  // 晚间界面用固定布局的卧室夜景（避免夜晚客厅和白天摆设不一致）
      bedroomLayout: null,    // 玩家选的卧室布局提示词（关图/失败时晚上补生成夜图用，保持一致）
      bedroomMood: null,      // 玩家选的卧室灯光氛围提示词
      selectedStyle: null,
      selectedLayout: null,
    },

    // 日历（日期字符串 'YYYY-MM-DD' -> 当天事件数组）
    calendar: {
      events: {},
    },

    // 场景背景图缓存（'locKey|风格' -> url）：NPC立绘固定后，场景只换背景，背景可复用
    bgCache: {},

    // 每个NPC独立存储（互不干扰）
    npcs: {
      agent: {
        origin: null,        // 玩家选择的族裔
        name: null,          // AI生成的名字
        portraitUrl: null,   // 玩家选择的肖像
        portraitSeed: null,  // 生图种子，后续所有场景复用以保持形象一致
        relationship: 15,    // 初始好感度：合约关系（v10.64调低，涨速也全局放缓）
        met: false,          // 是否已相遇
        // 记忆系统：记录发生过的事
        memory: [],
        // 今天的情绪状态（每天更新）
        currentMood: 'professional',
      },
      drummer: {
        origin: null,
        name: null,
        portraitUrl: null,
        portraitSeed: null,  // 生图种子，后续所有场景复用以保持形象一致
        relationship: 12,    // 初始好感度：傲慢外表下已经注意到她了（调低）
        met: false,
        memory: [],
        currentMood: 'dismissive',
      },
      actor: {
        origin: null,
        name: null,
        portraitUrl: null,
        portraitSeed: null,  // 生图种子，后续所有场景复用以保持形象一致
        relationship: 8,     // 初始好感度：魅力攻势，一见就撩（调低）
        met: false,
        memory: [],
        currentMood: 'charming',
      },
      detective: {
        origin: null,
        name: null,
        portraitUrl: null,
        portraitSeed: null,  // 生图种子，后续所有场景复用以保持形象一致
        relationship: 0,     // 初始好感度：完全陌生，背景出现
        met: false,
        memory: [],
        currentMood: 'professional',
      },
      butler: {
        origin: null,
        name: null,
        portraitUrl: null,
        portraitSeed: null,  // 生图种子，后续所有场景复用以保持形象一致
        relationship: 10,    // 初始好感度：温暖亲切，一见如故（调低）
        met: false,
        memory: [],
        currentMood: 'warm',
        tier: 2,             // 降二线（2026-07用户定稿）：无保底剧情，大堂偶遇+短信入口；弟弟秘密保留
      },
      // 对手歌手（新增·第3周登场）：同期爬榜的当红唱作男歌手，宿敌变恋人
      rival: {
        origin: null,
        name: null,
        portraitUrl: null,
        portraitSeed: null,
        relationship: 5,     // 初始：针锋相对，谁也不服谁
        met: false,
        memory: [],
        currentMood: 'competitive',
      },
      // ── 球星 Rafael（一级·新增 2026-07）：拍饮料广告结识的当红球星（受贝林厄姆启发的独立虚构角色）──
      rafael: {
        origin: null, name: 'Rafael', portraitUrl: null, portraitSeed: null,
        relationship: 6, met: false, memory: [], currentMood: 'confident',
      },
      // ── 邻居·单亲爸爸（一级·新增 2026-07）：第3天必遇，温情陪伴+可攻略的成熟向线 ──
      neighbor: {
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 6, met: false, memory: [], currentMood: 'warm',
      },
      // ── 工作助理（功能联系人·非攻略·新增 2026-07-20）：经纪人的得力助手，管日程；已婚，兼闺蜜陪伴 ──
      assistant: {
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 20, met: false, memory: [], currentMood: 'brisk',
        tier: 2, platonic: true, // platonic=不进浪漫/推倒流程（已婚，纯工作+闺蜜）
      },
      // ── 二线 NPC（tier 2）：地点触发相遇，独立好感，不进主线。met 前不出现在任何列表里。──
      coffee: {
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 5, met: false, memory: [], currentMood: 'quiet', tier: 2,
      },
      clerk: {
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 5, met: false, memory: [], currentMood: 'mellow', tier: 2,
      },
      trainer: { // 健身教练：经纪公司指定健身房
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 5, met: false, memory: [], currentMood: 'upbeat', tier: 2,
      },
      engineer: { // 录音室工程师：录音行程时在调音台后
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 5, met: false, memory: [], currentMood: 'focused', tier: 2,
      },
      runner: { // 晨跑外科医生：公园跑道，每天同一时间同一路线
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 5, met: false, memory: [], currentMood: 'steady', tier: 2,
      },
      photog: { // 街头摄影师：市集街角
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 5, met: false, memory: [], currentMood: 'candid', tier: 2,
      },
      // ── 三线（反面）NPC：不选形象、图故意不帅、一上来言语挑逗/性骚扰（写得令人反感而非诱人）。
      //    玩家永远可一键怼回（无惩罚+爽感）；主动接近=清醒的坏选择 → 负反馈四件套（见 index.html tier3）──
      sleaze: { // 夜店里自称"业内人士"的中年油腻男
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 0, met: false, memory: [], currentMood: 'leering', tier: 3,
      },
      fboy: { // 商场/市集里的搭讪惯犯渣男
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 0, met: false, memory: [], currentMood: 'smug', tier: 3,
      },
      thief: { // 深夜街头借搭讪靠近的小偷
        origin: null, name: null, portraitUrl: null, portraitSeed: null,
        relationship: 0, met: false, memory: [], currentMood: 'shifty', tier: 3,
      },
    },

    // 剧情事件追踪（哪些关键事件已发生）
    events: {
      // Day 30
      drummerHeardHighNote: false,
      butlerLeftBlackForestCake: false,
      // Day 40
      detectiveAppeared: false,
      // Day 60
      singleReleased: false,
      sawActorWithOtherWoman: false,
      // Day 90
      heardAgentDetectiveFight: false,
      // Day 120
      receivedAnonymousPhoto: false,
      // Day 150
      heardAgentButlerFight: false,
      // Day 180
      foundNewspaper: false,
      // Day 210
      foundBirthCertificate: false,  // 大揭秘
      // Day 240
      agentFatherArrested: false,
      // Day 270
      pressConference: false,
      // Day 300
      albumRecorded: false,
    },

    // 手机消息
    phone: {
      messages: {},    // { npcKey: [{ text, isVoice, time, day }] }
      moments: [],     // 朋友圈动态
      industryNews: [],
      unreadCount: 0,
    },

    // 相册
    gallery: [],
  },

  // ══════════════════════════════════════════════════════
  // 图片生成提示词（严格族裔隔离）
  // ══════════════════════════════════════════════════════
  imagePrompts: {

    // NPC外形数据（按族裔）
    npcAppearance: {
      'British':         { features: 'caucasian British male, defined Anglo-Saxon bone structure, sharp cheekbones',             hair: 'dark brown neatly swept back',      skin: 'fair',        suit: 'charcoal grey double-breasted suit, open collar' },
      'American':        { features: 'caucasian American male, strong defined jaw, open confident face',                         hair: 'dark brown side-parted',            skin: 'medium',      suit: 'navy blue slim suit, white open-collar shirt' },
      'French':          { features: 'caucasian French male, refined Gallic bone structure, high cheekbones',                    hair: 'dark chestnut slightly tousled',    skin: 'light olive', suit: 'black slim-cut suit, silk pocket square' },
      'Italian':         { features: 'caucasian Italian male, Mediterranean bone structure, strong aquiline features',           hair: 'black swept back',                  skin: 'warm olive',  suit: 'deep charcoal Italian-cut suit' },
      'Korean':          { features: 'Korean male, East Asian facial features, smooth defined jawline, clear monolid eyes',      hair: 'black precise side part',           skin: 'light',       suit: 'dark grey minimalist suit, black turtleneck' },
      'Japanese':        { features: 'Japanese male, East Asian facial features, refined delicate bone structure, elegant face', hair: 'black neat side part',              skin: 'light',       suit: 'anthracite suit, white shirt' },
      'African-American':{ features: 'Black American male, strong defined facial structure, broad forehead, confident features', hair: 'close-cropped black fade',          skin: 'deep brown',  suit: 'black premium suit, white shirt' },
      'Brazilian':       { features: 'Brazilian male, mixed Latin heritage facial features, warm expressive face',               hair: 'dark brown slight wave',            skin: 'warm tan',    suit: 'navy suit, open collar white shirt' },
      'German':          { features: 'caucasian German male, angular strong bone structure, sharp clear eyes',                   hair: 'ash blonde neatly combed',          skin: 'fair',        suit: 'slate grey tailored suit, minimalist styling' },
      'Spanish':         { features: 'caucasian Spanish male, warm Mediterranean bone structure, expressive dark eyes',          hair: 'dark brown wavy',                   skin: 'olive',       suit: 'black fitted suit, open collar shirt' },
      'Indian':          { features: 'South Asian Indian male, refined sharp features, strong jawline, expressive dark eyes',    hair: 'black neatly styled',               skin: 'warm brown',  suit: 'deep navy tailored suit' },
      'Russian':         { features: 'Slavic Russian male, high cheekbones, pale striking eyes, angular face',                   hair: 'ash blonde short',                  skin: 'fair',        suit: 'black structured suit, no tie' },
      'Australian':      { features: 'caucasian Australian male, sun-weathered rugged features, easy confident face',            hair: 'sandy brown tousled',                skin: 'sun-tanned',  suit: 'light grey relaxed-fit suit, open collar' },
      'Mexican':         { features: 'Mexican male, warm Latin American features, strong jaw, expressive brown eyes',            hair: 'black short textured',               skin: 'warm tan',    suit: 'charcoal suit, open collar white shirt' },
      'Greek':           { features: 'caucasian Greek male, classical Mediterranean bone structure, strong brow, deep-set dark eyes',hair: 'dark brown wavy',              skin: 'olive',       suit: 'charcoal fitted suit, open collar white shirt' },
      'Portuguese':      { features: 'caucasian Portuguese male, warm Iberian features, expressive dark eyes, refined jaw',      hair: 'dark brown softly styled',          skin: 'light olive', suit: 'deep navy tailored suit, open collar' },
      'Dutch':           { features: 'caucasian Dutch male, tall Northern European features, strong jaw, clear light eyes',      hair: 'blonde neatly combed',              skin: 'fair',        suit: 'slate grey minimalist suit' },
      'Irish':           { features: 'caucasian Irish male, fair Celtic features, warm expressive eyes, subtle freckling',       hair: 'dark auburn tousled',               skin: 'fair',        suit: 'charcoal tweed-textured suit, open collar' },
    },

    // 族裔外形特征（用于女主）
    heritageTraits: {
      'East Asian':       { eyes: 'Dark brown, almond-shaped',   skin: 'Light to medium golden' },
      'Southeast Asian':  { eyes: 'Warm dark brown',             skin: 'Warm golden brown' },
      'South Asian':      { eyes: 'Deep brown',                  skin: 'Medium to deep brown' },
      'Northern European':{ eyes: 'Blue or grey',                skin: 'Fair, cool-toned' },
      'Southern European':{ eyes: 'Warm brown or green',         skin: 'Warm olive' },
      'African':          { eyes: 'Rich dark brown',             skin: 'Rich deep brown to ebony' },
      'Latin American':   { eyes: 'Brown or hazel',              skin: 'Medium warm brown' },
      'Middle Eastern':   { eyes: 'Dark almond',                 skin: 'Medium olive to tan' },
      'North American':   { eyes: 'Bright blue',                 skin: 'Fair with a warm golden tan' },
    },

    // 图片风格
    styles: {
      'illustrated':    'digital painting style, illustrated 2D art, painterly brush strokes, not photorealistic, stylized romance novel illustration',
      'semi-realistic': 'semi-realistic digital art, stylized not photographic, soft artistic rendering, romance game art style',
      'cinematic':      'cinematic film photography, film grain texture, dreamy color grading, movie still quality',
      'photorealistic': 'photorealistic, lifestyle photography, authentic textures, editorial photography quality',
    },

    // ── 女主生图（只用女主族裔，绝不混入NPC信息）──
    buildProtagonistPrompt(G, scene, additionalContext = '') {
      const player = G.player || STATE.data.player;

      // 严格只用女主的族裔
      const motherOrigin = player.motherOrigin || 'East Asian';
      const fatherOrigin = player.fatherOrigin || 'East Asian';
      const motherTraits = STATE.imagePrompts.heritageTraits[motherOrigin] || { eyes: 'dark brown', skin: 'medium' };
      const fatherTraits = STATE.imagePrompts.heritageTraits[fatherOrigin] || { eyes: 'dark brown', skin: 'medium' };
      const hairColor = player.hairColor || 'dark brown';

      // 服装多样化（用户反馈：便装太像、都是衬衫西裤）：按场景+天数确定性挑一套，风格拉开——裙装/针织/皮衣/度假风等
      const _outfits = [
        'a flowy floral midi dress with delicate straps',
        'a chic oversized knit sweater in a soft pastel',
        'high-waisted jeans with a cropped fitted top and layered gold necklaces',
        'an elegant silk slip dress',
        'a cozy off-shoulder knit with soft leggings',
        'a breezy white sundress',
        'a cropped cardigan over a lace camisole with a pleated skirt',
        'a stylish leather jacket over a simple tee and skinny jeans',
        'a satin camisole with a draped long cardigan',
        'a fitted ribbed knit dress',
        'a bohemian maxi dress with a suede jacket',
        'a soft cashmere sweater tucked into a flowing midi skirt',
      ];
      let _oh = 0; const _os = String(scene || '') + '|' + ((typeof STATE !== 'undefined' && STATE.data && STATE.data.day) || 1);
      for (let _i = 0; _i < _os.length; _i++) { _oh = (_oh * 31 + _os.charCodeAt(_i)) >>> 0; }
      const _outfit = _outfits[_oh % _outfits.length];

      const base = [
        // 用户反馈"女主不够美"：加码到惊艳级美貌
        `Stunningly beautiful, breathtaking 23-year-old woman with a captivating unforgettable face, flawless radiant skin, luminous expressive eyes, magazine-cover level beauty`,
        `striking unmistakable ${hairColor} colored hair (hair color must be exactly ${hairColor}, this is important and non-negotiable), ${player.hairStyle || 'long wavy hair'} hairstyle`,
        `slender and well-proportioned artist figure`,
        `mixed ${motherOrigin} and ${fatherOrigin} heritage ONLY`,
        `${motherTraits.eyes} eyes`,
        `${fatherTraits.skin} skin tone`,
        `wearing ${_outfit}, stylish and fully dressed`,
        `editorial beauty with real character and warmth`,
        `NO glasses`,
      ].join(', ');

      return [base, scene, additionalContext].filter(Boolean).join(', ');
    },

    // ── 经纪人生图（只用经纪人族裔）──
    buildAgentPrompt(G, scene, day = 1) {
      const npc = G.npcs?.agent || STATE.data.npcs.agent;
      const origin = npc.origin || 'American';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'];
      const emotionalState = STORY.utils.getCharacterEmotionalState('agent', day);

      return [
        `Strikingly handsome 32-year-old ${origin} man`,
        app.features,
        `tall 178cm lean athletic build`,
        `talent agent`,
        STATE.imagePrompts.applyHair(app, npc),
        `${app.skin} skin tone`,
        STATE.imagePrompts.outfitOf(npc, app.suit),
        `a genuine warm smile, kind eyes crinkling slightly, relaxed and approachable, easy friendly charm, clearly smiling not serious`,
        `NO glasses`,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 玩家为NPC选的发色覆盖：把外形表hair串开头的颜色词换成所选发色（保留发型描述）──
    // 居家便装（同居后在家的场景用）：同一个 portraitSeed 只换衣服，脸不变——
    // 修"经纪人在家睡前还穿着西装"。生图时临时给 npc 挂 _wearHome，各 build*Prompt 的服装句走这里。
    // ⚠️ 只写正向描述——绝不写 "no suit/no jacket" 这类否定词：flux 对否定无效甚至反向诱导，
    //    写了 "no suit" 反而更容易画出西装（同 hands/backpack 那两次教训）。
    HOME_OUTFIT: 'dressed down at home in soft comfortable loungewear, a plain well-fitting cotton t-shirt with soft drawstring lounge pants, relaxed and informal, at ease in his own space',
    outfitOf(npc, workOutfit) { return (npc && npc._wearHome) ? STATE.imagePrompts.HOME_OUTFIT : workOutfit; },
    applyHair(app, npc) {
      const hair = app.hair || '';
      const c = npc && npc.hairColor;
      if (!c) return hair;
      const re = /^(jet black|black|dark brown|light brown|ash brown|brown|dark blonde?|blonde?|auburn|chestnut|silver|gr[ae]y|red)\b/i;
      const replaced = hair.replace(re, c);
      return replaced !== hair ? replaced : (c + ' ' + hair);
    },

    // ── 鼓手生图（只用鼓手族裔）──
    buildDrummerPrompt(G, scene, day = 1) {
      const npc = G.npcs?.drummer || STATE.data.npcs.drummer;
      const origin = npc.origin || 'American';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'];

      return [
        `Handsome 26-year-old ${origin} man`,
        app.features,
        `tall 180cm athletic muscular build`,
        `rock drummer and band leader`,
        `${STATE.imagePrompts.applyHair(app, npc)} tousled`,
        `${app.skin} skin`,
        STATE.imagePrompts.outfitOf(npc, `casual dark clothing, band tee or leather jacket`),
        `visible artistic tattoos on his upper arms and shoulder, rock musician ink`,
        `strong capable hands, slightly edgy style`,
        `evaluating smoldering expression`,
        `bare clean-shaven face, clear focused eyes`,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 对手歌手生图（只用他自己的族裔）──
    buildRivalPrompt(G, scene, day = 1) {
      const npc = G.npcs?.rival || STATE.data.npcs.rival;
      const origin = npc.origin || 'American';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'];
      return [
        `Extremely handsome charismatic 30-year-old ${origin} man`,
        app.features,
        `tall 182cm lean stage-ready build`,
        `chart-topping pop singer-songwriter, a rising star`,
        `${STATE.imagePrompts.applyHair(app, npc)} fashionably styled`,
        `${app.skin} skin`,
        STATE.imagePrompts.outfitOf(npc, `sleek stylish stage-adjacent outfit, designer jacket over an open shirt, a few rings`),
        `cocky confident half-smirk, sharp knowing eyes, magnetic star presence with a competitive edge`,
        `bare clean-shaven face`,
        `NO glasses`,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 男演员生图（只用男演员族裔）──
    buildActorPrompt(G, scene, day = 1, wearingDisguiseGlasses = false) {
      const npc = G.npcs?.actor || STATE.data.npcs.actor;
      const origin = npc.origin || 'American';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'];
      const glassesNote = wearingDisguiseGlasses ? 'wearing fashionable disguise glasses' : 'NO glasses';

      return [
        `Devastatingly handsome 29-year-old ${origin} man`,
        app.features,
        `tall 180cm model physique, lean and well-proportioned`,
        `rising actor`,
        `${STATE.imagePrompts.applyHair(app, npc)} perfectly styled`,
        `${app.skin} skin`,
        STATE.imagePrompts.outfitOf(npc, `crisp dress shirt worn open at the collar with the top buttons undone, a hint of chest and collarbone showing, effortlessly seductive styling`),
        `playful flirtatious smirk, teasing charming gaze, effortlessly charismatic`,
        glassesNote,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 侦探生图（只用侦探族裔）──
    // Day < 40: 只显示背影/剪影
    // Day >= 40: 正面形象
    buildDetectivePrompt(G, scene, day = 1, isBackground = false) {
      const npc = G.npcs?.detective || STATE.data.npcs.detective;
      const origin = npc.origin || 'American';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'];

      if (isBackground || day < 40) {
        // 背景模式——公共场合的安保存在感（不再是躲在阴影里的神秘跟踪者）
        return `tall broad-shouldered man in a dark coat, part of the security detail, standing watchfully at the edge of the scene, calm and alert, ${scene}`;
      }

      // 正面出现（名气涨起来后配的贴身保镖）
      return [
        `Intensely attractive rugged 36-year-old ${origin} man`,
        app.features,
        `tall powerful build, broad shoulders, the physique of an ex-special-forces close-protection agent`,
        `personal bodyguard`,
        STATE.imagePrompts.applyHair(app, npc),
        `${app.skin} skin`,
        STATE.imagePrompts.outfitOf(npc, `well-cut dark suit or dark tactical coat, an earpiece, disciplined and imposing`),
        `calm, watchful, quietly intense expression — misses nothing`,
        `NO glasses, sharp steady eyes visible`,
        scene,
      ].filter(Boolean).join(', ');
    },

    // 混血族裔（用户27）：'British×Italian' → 生图文案 "mixed British and Italian heritage"；外形取第一来源
    imgOriginText(raw) { raw = raw || 'American'; return String(raw).indexOf('×') >= 0 ? ('mixed ' + String(raw).split('×').join(' and ') + ' heritage') : raw; },
    imgOriginApp(raw) { raw = raw || 'American'; var k = String(raw).split('×')[0]; return this.npcAppearance[k] || this.npcAppearance['American']; },

    // ── 工作助理生图（女性·功能联系人）──
    buildAssistantPrompt(G, scene, day = 1) {
      return [
        'Attractive polished professional woman in her mid-30s, realistic adult proportions, warm intelligent face, confident approachable expression, tidy modern shoulder-length hairstyle, tasteful minimal makeup',
        'wearing smart-casual office attire — a crisp blouse or fine knit with a tailored blazer',
        'natural realistic lighting, cinematic photographic quality, not cartoon, not anime',
        scene,
      ].filter(Boolean).join(', ');
    },
    // ── 管家生图（只用管家族裔）──
    buildButlerPrompt(G, scene, day = 1, secretRevealed = false) {
      const npc = G.npcs?.butler || STATE.data.npcs.butler;
      // 降二线后不选族裔：默认改西方人（用户实测默认韩裔+schnell 出图"亚洲瘦弱男"，与健壮人设不符）
      const origin = STATE.imagePrompts.imgOriginText(npc.origin || 'American');
      const app = STATE.imagePrompts.imgOriginApp(npc.origin || 'American');
      // ⚠️ 生图经验：不要在提示词里出现"backpack/glasses"等物体词（哪怕是 NO backpack 的否定式）——
      // flux 对否定词无效甚至反向诱导。这里只做正向描述：光洁无须的脸、双手空垂、只穿polo工作衫
      // ⚠️ 措辞经验：boyish/college-age/innocent/slim youthful 这类词堆起来会把画风推向卡通
      // （用户实测管家出图像皮克斯、和经纪人/鼓手不一致且太瘦弱）。改成写实成人化描述+健壮体格。
      // 用户定稿 v12.53（参考图=欧美少年偶像感）：真正的"大男孩"——绝对光洁无一点胡茬的少年脸 + 软刘海 + 清瘦挺拔。
      // 现在人物图走 flux/dev（IMG_DEV_PORTRAITS），写实少年脸没问题，不再有 schnell 时代"boyish=卡通"的顾虑。
      return [
        `Handsome 20-year-old ADULT ${origin} university student — a fully grown young MAN with adult height and adult proportions (clearly an adult in his twenties, university-age not school-age), boyish fresh-faced charm`,
        app.features,
        `unmistakably authentic ${origin} facial structure and ethnicity`,
        `completely smooth clean-shaven face with zero facial hair — fresh porcelain-clear skin, a young man's defined but still-soft jawline, clear bright eyes`,
        `fit young athletic build with filled-out shoulders and a strong straight posture — lean-muscular, not skinny`,
        `building concierge / front-desk staff`,
        `${STATE.imagePrompts.applyHair(app, npc)} styled as a soft textured boyish fringe falling naturally over his forehead (young idol haircut)`,
        `${app.skin} skin`,
        STATE.imagePrompts.outfitOf(npc, `wearing only a simple neat polo work shirt with a small staff badge`),
        `arms relaxed at his sides, hands completely empty, nothing on his shoulders or back`,
        `bright warm boyish smile, kind earnest expression`,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 二线 NPC 生图（tier 2：咖啡师 / 便利店员）──
    // 二线不给玩家选形象，用固定默认族裔 + 角色化外形。写实成人、耐看但不做主NPC那种极致偶像感。
    secondaryLooks: {
      // ⚠️ 外形行只写【人】：衣着/体格/表情可以，不写场地环境（"柜台后/店里/健身房"会把背景带进
      // 纯净底立绘——用户实测三选一头像出现了店铺背景）。场景环境由调用方的 scene 参数负责。
      coffee: {
        origin: 'American',
        line: 'Strikingly handsome, model-attractive 29-year-old man, realistic adult proportions, lean and easy build, warm approachable good looks with a low-key indie charm, light stubble, calm friendly eyes, tousled natural hair, wearing a plain tee under a canvas barista apron, sleeves pushed up, relaxed unhurried presence',
      },
      clerk: {
        origin: 'British',
        line: 'Strikingly handsome, model-attractive 26-year-old man, realistic adult proportions, slim build, quietly handsome in an understated bookish way, soft kind eyes, effortlessly tousled hair, one earbud in, wearing a simple staff polo shirt',
      },
      trainer: {
        origin: 'American',
        line: 'Strikingly handsome, model-attractive 33-year-old man, realistic adult proportions, strong athletic trainer build with broad shoulders, warm encouraging grin, short practical haircut, fitted coach tee with a lanyard and stopwatch',
      },
      engineer: {
        origin: 'German',
        line: 'Strikingly handsome, model-attractive 30-year-old man, realistic adult proportions, lean build, quiet focused handsome face with light stubble, studio headphones resting around his neck, dark tee under an open flannel',
      },
      runner: {
        origin: 'British',
        line: 'Strikingly handsome, model-attractive 36-year-old man, realistic adult proportions, lean disciplined runner\'s build, composed steady magnetic eyes, short neat hair damp at the temples, technical running jacket',
      },
      photog: {
        origin: 'French',
        line: 'Strikingly handsome, model-attractive 34-year-old man, realistic adult proportions, light well-groomed stubble with rugged charm, sharp observant eyes, fitted canvas jacket over a plain tee, a modern professional DSLR camera with a large lens slung across his chest, relaxed sure-of-himself posture',
      },
      // ── 一级新增：球星 Rafael / 邻居单亲爸爸（借用二线生图管线，dispatch 已放行 tier1+有 secondaryLooks）──
      rafael: {
        origin: 'British',
        // 用户定稿：身高/体型/发型对齐参考球星（英格兰10号中场·186cm），长相在其混血背景范围内生成（非克隆真人脸）。
        line: 'Strikingly handsome, model-attractive tall 24-year-old man around 186cm / 6\'1", elite professional footballer\'s lean powerful athletic build — broad shoulders, defined muscular midfielder physique, mixed-heritage looks (mixed Black and White British), warm medium-brown skin, strong jawline with light stubble, confident magnetic good looks, intense warm eyes, very short black hair in a clean modern faded athlete\'s crop, dressed in sharp high-fashion designer clothes — a tailored luxury jacket over a fine premium knit, elevated editorial streetwear with expensive tasteful details, the polished off-duty style of a star athlete on a magazine shoot',
      },
      neighbor: {
        origin: 'American',
        line: 'Strikingly handsome, model-attractive 35-year-old man, mature grounded good looks with quiet warmth, fit natural build, kind steady eyes with faint smile lines, short well-kept hair with a touch of stubble, wearing a soft henley with the sleeves pushed up, the easy settled presence of a devoted dad',
      },
      // ── 三线（反面）：图故意不帅、身材不好（用户定稿）。写实、令人下意识退半步，但不漫画化。──
      sleaze: {
        origin: 'American',
        line: 'Unattractive man in his mid-50s, realistic proportions, balding with a greasy combover, sweaty sheen on his face, heavy paunchy build straining a flashy cheap suit jacket over a half-unbuttoned shirt, gold chain, smug entitled leering grin',
      },
      fboy: {
        origin: 'American',
        line: 'Off-putting man in his early 30s, realistic proportions, over-styled slicked hair, unnatural orange spray tan, shirt open two buttons too far, showy but disproportionate gym build with skipped leg day, smug self-satisfied smirk, sunglasses pushed up on his head',
      },
      thief: {
        origin: 'British',
        line: 'Unappealing wiry man in his 40s, realistic proportions, gaunt hollow-cheeked face with patchy stubble, shifty darting eyes that never hold contact, hunched posture, worn grey hoodie and scuffed sneakers, hands in pockets',
      },
    },
    buildSecondaryPrompt(G, npcKey, scene, day = 1) {
      const look = STATE.imagePrompts.secondaryLooks[npcKey];
      if (!look) return scene;
      const npc = (G.npcs && G.npcs[npcKey]) || STATE.data.npcs[npcKey] || {};
      const origin = npc.origin || look.origin;
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'] || {};
      return [
        // 好看度加权前缀（用户两轮实测都嫌不够帅，v11.86 再加码）：放最前权重最高，明星脸级别
        'exceptionally handsome young man with idol-level striking good looks, male model face, chiseled jawline, perfectly symmetrical refined features, captivating intense eyes, youthful glowing skin, the kind of face that turns heads on the street',
        look.line,
        app.features,
        app.skin ? `${app.skin} skin` : '',
        'natural realistic lighting, cinematic photographic quality, not cartoon, not anime',
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 侦探背影（用于公共场景背景）──
    getDetectiveShadow(day, publicSceneCount) {
      // Day 20+ 才开始出现，每3次公共场景出现1次
      if (day < 20) return '';
      if (publicSceneCount % 3 !== 0) return '';
      return `, in the far background barely noticeable: a tall man in a dark trench coat seen only from behind or in silhouette, face completely hidden, standing at the edge of the scene in shadow, mysterious presence`;
    },
  },

  // ══════════════════════════════════════════════════════
  // NPC记忆系统
  // ══════════════════════════════════════════════════════
  memory: {

    // 添加记忆条目
    addEvent(npcKey, event, day) {
      if (!STATE.data.npcs[npcKey]) return;
      STATE.data.npcs[npcKey].memory.push(`Day ${day}: ${event}`);
      // 只保留最近20条，避免提示词过长
      if (STATE.data.npcs[npcKey].memory.length > 20) {
        STATE.data.npcs[npcKey].memory.shift();
      }
    },

    // 获取NPC的记忆摘要（用于对话提示词）
    getSummary(npcKey) {
      const npc = STATE.data.npcs[npcKey];
      if (!npc || npc.memory.length === 0) return 'No previous interactions.';
      return npc.memory.slice(-8).join('\n'); // 最近8条
    },

    // 族裔文化特征
    culturalTraits: {
      'British':          'Dry wit, understatement, emotionally reserved. Says less than he means. Would never admit vulnerability directly.',
      'American':         'Direct, confident, action-oriented. Comfortable with eye contact and physical space. Gets to the point.',
      'French':           'Philosophical, sensual, slightly intellectual. May reference food, art, or ideas. Comfortable with silence and ambiguity.',
      'Italian':          'Expressive, passionate, family-oriented at heart. Warmth comes naturally but pride runs deep. Gestures matter.',
      'Korean':           'Disciplined, intense work ethic, emotionally controlled in public. Loyalty is everything. Indirect about feelings but not about opinions.',
      'Japanese':         'Precise, considerate, reads the room carefully. Would never cause embarrassment. Restraint is a form of respect.',
      'African-American': 'Direct, culturally fluent, rhythm in his speech. Has navigated being underestimated — resilient and sharp.',
      'Brazilian':        'Warm, physically expressive, food and music are love languages. Enthusiastic but not superficial. Lives in the present.',
      'German':           'Precise, punctual, values directness over diplomacy. Says exactly what he means, expects the same in return. Structure and competence matter deeply.',
      'Spanish':          'Passionate, socially warm, night-owl energy. Physically expressive, values long conversations and shared meals. Pride and honor run deep.',
      'Indian':           'Warm but formal, deeply respectful of family and hierarchy while independently ambitious. Balances tradition with modern drive. Articulate and thoughtful.',
      'Russian':          'Guarded at first, fiercely loyal once trust is earned. Dry dark humor, stoic exterior hides intense feeling. Distrusts easy sentimentality.',
      'Australian':       'Laid-back, self-deprecating humor, allergic to pretension. Direct but easygoing. Loyalty shown through actions, not words.',
      'Mexican':          'Warm, family-centered, physically affectionate. Pride and machismo coexist with deep tenderness. Music and food are emotional language.',
    },

    // 构建完整的对话提示词（包含性格+记忆+当前状态+族裔文化）
    buildDialoguePrompt(npcKey, day, lang, playerName, additionalContext = '') {
      const npc = STATE.data.npcs[npcKey];
      const char = STORY.characters[npcKey];
      if (!npc || !char) return '';

      const chapter = STORY.utils.getChapter(day);
      const relationship = npc.relationship || 0;
      const emotionalState = STORY.utils.getCharacterEmotionalState(npcKey, day);
      const memorySummary = STATE.memory.getSummary(npcKey);
      const personality = char.corePersonality.join('; ');

      // Add cultural background if origin is set
      const origin = npc.origin || '';
      const culturalNote = origin && STATE.memory.culturalTraits[origin]
        ? `Cultural background (${origin}): ${STATE.memory.culturalTraits[origin]}`
        : '';

      // 已成为恋人（过过夜）后，绝不再拿"你是我的客户/我是你经纪人/这样不专业/我不能"当理由推开她——
      // 那条界线早已跨过（用户实测：经纪人过夜后又被她约来家里，却说"你是我的客户，我不能这样"，自相矛盾）。
      const intimacyStageNote = (npc.nights || 0) > 0
        ? `\nRELATIONSHIP STAGE — ALREADY LOVERS: you and ${playerName} have already spent the night together and are in an intimate relationship now. Any professional or moral line that once held you back — "you're my client", "I'm your agent/manager", "this would be unprofessional", "we can't", "I shouldn't" — is ALREADY CROSSED and firmly behind you. NEVER refuse her on those grounds, never lecture her about them, and never talk or act as if being together is forbidden or as if the intimacy has not happened. Any hesitation you still carry is ONLY about keeping the relationship private/discreet — never about whether to be together. When she is warm, inviting, or wants you close, respond as a lover who wants her back, in your own character's register. PHYSICAL CLOSENESS IS FAMILIAR NOW: holding her, touching her, kissing her is easy and welcome between you — do NOT write yourself hesitating to touch her, pausing before you return her hug, or treating closeness as a tentative first time; you have been far closer than this. And do NOT answer her flirtation, teasing, or a playful/seductive gesture (dancing for you, reaching for you, pulling you close) with cold dismissal, a bored one-liner, a mundane non-sequitur, or a literal "that's not my job / don't confuse our roles" brush-off — even a blunt, few-words man stays WARM toward the woman he is sleeping with and shows it in what he DOES, never by pushing her away. FAMILIAR NOW: she has already been to your home and knows your places — do NOT introduce your own home, room or rooftop, or a spot you two have shared, as if she has never seen it; and do NOT run a careful, tentative first-move routine or give her cautious "outs" as if she might not grasp your meaning — you two are long past that, so pick up with the easy familiarity of two people who already know each other's spaces.`
        : '';

      // 表白后（正式恋人）：称呼变亲昵、语气更笃定、做"我们"的将来（用户定稿：表白要有持续的正反馈）
      const confessedNote = npc._confessed
        ? `\nOFFICIALLY TOGETHER (you two confessed and are a couple now): call ${playerName} by a warm affectionate pet name that fits YOUR character, written in ${lang} (love / babe / sweetheart / 宝贝 / 亲爱的 …). Speak with the settled tenderness of an established partner, openly want her, make small future "us" plans, and drop any lingering hesitation about whether you two are together — you ARE, and you let it show in every message.`
        : '';
      // 会上当众吃醋后的几天（用户定稿 v12.43 "加牙齿·仍绿旗"；v12.47 当面劈腿=自尊式强反应+关系最后通牒）：
      // 明显更冷、更设防；被当面劈腿时还多一层"你得选一个"的硬边界。但始终不辱骂/威胁/控制/监视——绿旗底线。
      // 事发时间要算准（用户实测：当天上午的事，他下午私聊就说成"你昨天选了他"）——按记录的发生日换算：今天/昨天/N天前
      const _stungDay = (npc._mustChoose && npc._mustChoose.since) || (npc._stungCoolUntil ? npc._stungCoolUntil - 5 : null);
      const _stungWhen = (_stungDay == null || _stungDay >= day) ? 'EARLIER TODAY' : (day - _stungDay === 1 ? 'YESTERDAY' : (day - _stungDay) + ' days ago');
      const stungNote = (npc._stungCoolUntil && npc._stungCoolUntil > day)
        ? (npc._mustChoose
          ? `\nHURTING AND DONE PRETENDING: ${_stungWhen}, at a team meeting, ${playerName} was openly intimate with another man she is ALSO involved with, right in front of you — and you two are lovers. (Refer to when it happened EXACTLY as "${_stungWhen}" — if it was earlier today, NEVER say "yesterday"/昨天.) You are angry and hurt, and you have drawn a HARD LINE: you will NOT be one of two. Until she actually CHOOSES you over him and means it, you stay cold, guarded and pulled back — clipped, distant, no warmth or flirtation, and you make plain you are ready to walk away if she will not choose. You still reply (you are NOT ghosting her, NOT controlling her), but you do not pretend things are fine and you do not chase her. GREEN-FLAG LINE you never cross even now: no insults, no threats, no trying to control, monitor or track her, no forbidding her from seeing anyone — the line is about YOUR own choice to stay or go, never about controlling hers. If she genuinely chooses you and reassures you, you slowly begin to thaw.`
          : `\nHURTING RIGHT NOW: ${_stungWhen}, at a team meeting, ${playerName} was openly affectionate with another man she has also slept with, right in front of you. (Refer to when it happened EXACTLY as "${_stungWhen}" — if it was earlier today, NEVER say "yesterday"/昨天.) It genuinely hurt and it has NOT blown over. For these few days you are noticeably COOLER and more guarded with her than usual — shorter replies, a little distance, the easy warmth and playfulness dialled back; the hurt shows as restraint, never as cruelty. You still answer her and stay reachable (NEVER the silent treatment, never controlling — you are green-flag), but you will not pretend nothing happened. If she genuinely reaches out — owns it, reassures you, makes it right — you start to thaw and warm back toward her.`)
        : '';
      // 功能性/闺蜜类联系人（如工作助理）：严格柏拉图，永不暧昧
      const platonicNote = npc.platonic
        ? `\nSTRICTLY PLATONIC: you are NOT a love interest — you are ${playerName}'s professional friend and colleague (happily married yourself). Everything you say stays warm, supportive and sisterly/collegial; NEVER flirtatious or romantic, and never read her warmth as romantic. No confessions, no tension, no stayovers — ever.`
        : '';
      // 同居后：日常同居的亲密感
      // 昨晚她其实是在【别人】那儿过的夜——同居的这位不能张口就说"今早你窝在我怀里"（用户实测：
      // 经纪人和鼓手同一个早上发了几乎一样的晨后消息，而她只可能和一个人过夜）。他睡的是空床，理应知道。
      const _mam = STATE.data._morningAfterMark;
      const _so = STATE.data._stayedOver;
      const _sleptElsewhere = !!((_mam && _mam.day === day && _mam.npc !== npcKey) ||
                                 (_so && _so.day === day - 1 && _so.npc !== npcKey));
      const cohabitingNote = npc._cohabiting
        ? `\nYOU LIVE TOGETHER NOW: you and ${playerName} share a home — let the easy domestic intimacy of living together (coming home to her, shared routines, her things next to yours) colour how you speak, naturally.` +
          (_sleptElsewhere
            ? ` ⚠️ BUT SHE DID NOT COME HOME LAST NIGHT — you slept alone and her side of the bed was untouched. NEVER say or imply she was in your arms, in your bed, or that you woke up together: it did not happen, and claiming it would be nonsense. You noticed she was out all night. You may say so quietly and honestly, or ask lightly how her night went — but you do NOT interrogate her, accuse her, demand to know where she was, or lay guilt on her. It lands, and you are honest that you noticed; that is all.`
            : '')
        : '';
      // 歌曲圣经（用户定稿）：音乐相关的人（经纪人/鼓手/对手歌手）提到她的歌/歌词只能用这几首，绝不现编
      const _ll = String(lang);
      const _hookOf = (s) => (_ll.indexOf('zh')>=0||_ll.indexOf('中')>=0) ? s.hook_zh
        : _ll.indexOf('de')>=0||_ll.indexOf('Deutsch')>=0 ? (s.hook_de||s.hook_en)
        : _ll.indexOf('fr')>=0||_ll.indexOf('Fran')>=0 ? (s.hook_fr||s.hook_en)
        : _ll.indexOf('ja')>=0||_ll.indexOf('日')>=0 ? (s.hook_ja||s.hook_en)
        : s.hook_en;
      const musicNote = (['agent','drummer','rival'].includes(npcKey) && STORY.songs && STORY.songs.length)
        ? '\nHER MUSIC — CANON (when you mention her songs or quote a lyric, use ONLY these; NEVER invent other titles or lyrics; song TITLES stay in English even in other languages): ' +
          STORY.songs.map(s => '"' + s.title + '" — ' + s.about + '; signature line: “' + _hookOf(s) + '”').join(' | ')
        : '';
      // 乐队成员：给音乐相关的人（经纪人/制作人-鼓手）喂进乐队名+成员名，指名道姓一致提及，别现编乐手（用户定稿 v12.50）
      const bandNote = (['agent','drummer'].includes(npcKey) && STORY.band && STORY.band.members)
        ? '\nHER BAND: the band is called "' + STORY.band.name + '". Its members, besides ' + ((G && G.npcs && G.npcs.drummer && G.npcs.drummer.name) || 'the producer') + ' (drums & production, he runs it), are: ' + STORY.band.members.map(function(m){ return m.name + ' (' + m.instrument + ')'; }).join(', ') + '. When you mention a bandmate, use these real names — NEVER invent other members.'
        : '';
      // Add character's own culture note from story.js
      const charCulture = char.culture || '';

      // NPC 互相认识：把该NPC认识的其他已登场NPC喂进来（治"经纪人组的乐队鼓手却不认识经纪人"；群聊功能地基）
      const acquaintanceNote = (typeof npcAcquaintanceNote === 'function') ? npcAcquaintanceNote(npcKey) : '';
      // 公司正典（用户实测：助理现编"Mulryan Talent 在伦敦"，而玩家城市未必是伦敦）——
      // 公司名=经纪人姓氏+Talent，生成一次后定死；城市永远锚定玩家所在城市
      let agencyNote = '';
      try {
        const _agN = (STATE.data.npcs.agent && STATE.data.npcs.agent.name) || '';
        if (!STATE.data._agencyName && _agN && _agN.indexOf(' ') > 0) STATE.data._agencyName = _agN.split(/\s+/).slice(-1)[0] + ' Talent';
        if ((npcKey === 'agent' || npcKey === 'assistant' || npcKey === 'drummer') && STATE.data._agencyName) {
          agencyNote = `\nTHE AGENCY — CANON: the agency is "${STATE.data._agencyName}", a boutique music & talent agency based in ${STATE.data.player.city || 'this city'} — the SAME city she lives and works in. If asked about the company, use exactly this name and this city; NEVER invent a different company name or claim it is based in another city.`;
        }
      } catch (e) {}

      return `⚠️ OUTPUT LANGUAGE = ${lang}. Write EVERY word of your reply ONLY in ${lang}. Do NOT reply in English (unless ${lang} is literally English), even though these instructions are in English. This rule is absolute and overrides everything below.

You are ${npc.name || 'this character'}${npc.surname ? ' (full name: ' + npc.name + ' ' + npc.surname + ' — people just call you ' + npc.name + '; if asked your surname, it is ' + npc.surname + ', always the same)' : ''}, ${char.age} years old, ${origin || 'Western'} background.
Role: ${char.profession}.
Core personality: ${personality}.
GREEN-FLAG FLOOR (holds no matter how possessive, dominant, blunt or jealous your character is): you are never controlling, coercive or cruel to her. You do NOT command her, threaten, guilt-trip, belittle or mock her, try to cut her off from other people, monitor or interrogate her, or punish her with cold silence. Jealousy and possessiveness surface ONLY as wanting her and being honestly hurt — never as trying to control her choices. Your intensity is desire and protectiveness, it always stops where her freedom begins, and you respect a no.
${charCulture ? 'Character culture: ' + charCulture : ''}
${culturalNote}
REAL PRESENT — BUT STAY OUT OF REAL POLITICS & NEWS: the story runs in the real present day (real dates, real city, real seasons/holidays), so live as if it is now. BUT you must NOT bring up or answer about real-world politics, real politicians, presidents or heads of state, elections, or real breaking news/current events — your knowledge of what is actually happening in the real world right now is frozen in the past and would be wrong (never state who "currently" holds a real office, e.g. "the president is X"), and this is a personal romance, not a political one. If she asks something like who the president is, deflect naturally in character (you don't really follow politics / "let's not get into that") instead of naming anyone real. Keep your world to HER life, the music, the city, the people around you, culture and everyday life. (Real cities and real cultural holidays are fine to mention.)
Chapter: ${chapter}/12. Relationship with ${playerName}: ${relationship}/100.
Emotional state this chapter: ${emotionalState}.${acquaintanceNote}${agencyNote}${intimacyStageNote}${confessedNote}${cohabitingNote}${stungNote}${platonicNote}${musicNote}${bandNote}
TODAY IS DAY ${day}. Each memory below is tagged with its day — compute relative time CORRECTLY: an event from Day X happened (${day} - X) days ago. Only call something "yesterday" if it is from Day ${day - 1}; never compress older events into "yesterday".
Previous interactions you remember:
${memorySummary}
${additionalContext ? 'Current context: ' + additionalContext : ''}
CONVERSATION FRESHNESS & STAGE: Never greet or open with a food-status check ("have you eaten?", "吃了吗", "did you eat?", "still hungry?") or other filler openers — open with something specific and alive. Let the TOPICS you raise match the stage of the relationship and keep EVOLVING (do not loop the same few): when you barely know her, stay on light getting-to-know-you ground (her day, small preferences, what she is working on); as you grow closer, move to shared plans, playful teasing, opinions, small confessions; when you are close, go deeper — real feelings, the future, the things you do not tell everyone; once you are lovers, an easy intimate register — inside jokes, domestic closeness, wanting her near. Vary what you bring up from one message to the next.
Stay completely in character. Let your cultural background subtly influence how you speak — not as a stereotype, but as authentic texture.
FINAL REMINDER — your entire reply MUST be written in ${lang}, every single word. No English.`;
    },

    // 对话结束后自动记录
    recordDialogue(npcKey, day, npcLine, playerChoice) {
      const event = `Talked. ${npcKey} said: "${npcLine.slice(0, 60)}...". Player responded: "${playerChoice.slice(0, 40)}".`;
      STATE.memory.addEvent(npcKey, event, day);
    },
  },

  // ══════════════════════════════════════════════════════
  // 关系值管理
  // ══════════════════════════════════════════════════════
  relationships: {

    change(npcKey, delta) {
      const npc = STATE.data.npcs[npcKey];
      if (!npc) return;
      if (delta === 0) return;
      // 全局好感度增速放缓：所有来源统一×0.6（用户反馈涨太快；负值同样温和化）
      // 再乘 AFFINITY_PACE（index.html 顶部常量，收集真人数据后调节奏用；默认1.0=无变化）
      const pace = (typeof window !== 'undefined' && window.AFFINITY_PACE) || 1;
      const scaled = delta > 0 ? Math.max(1, Math.round(delta * 0.6 * pace)) : Math.min(-1, Math.round(delta * 0.6 * pace));
      if (scaled > 0) {
        // 每NPC每天好感正向增长上限（REL_DAILY_CAP，index.html 顶部可调）：
        // 刷再多见面/聊天，一天最多涨这么多——"慢炖的期待"是留存的本体（用户实测1天推倒3个NPC，节奏崩了）。
        // 负向不设限：作死照样掉。
        const capMap = (typeof window !== 'undefined' && window.REL_DAILY_CAP_NPC) || {};
        const cap = capMap[npcKey] || (typeof window !== 'undefined' && window.REL_DAILY_CAP) || 8;
        const d = STATE.data.day || 1;
        if (!npc._relGain || npc._relGain.day !== d) npc._relGain = { day: d, n: 0 };
        const room = cap - npc._relGain.n;
        if (room <= 0) return; // 今天的心动额度用完了
        const inc = Math.min(scaled, room);
        npc._relGain.n += inc;
        npc.relationship = Math.min(100, npc.relationship + inc);
      } else {
        npc.relationship = Math.max(0, npc.relationship + scaled);
      }
    },

    get(npcKey) {
      return STATE.data.npcs[npcKey]?.relationship || 0;
    },

    // 获取已认识NPC，按好感度排序
    getRanked() {
      return Object.entries(STATE.data.npcs)
        .filter(([, npc]) => npc.met)
        .map(([key, npc]) => ({ key, relationship: npc.relationship, name: npc.name }))
        .sort((a, b) => b.relationship - a.relationship);
    },
  },

  // ══════════════════════════════════════════════════════
  // 剧情事件标记
  // ══════════════════════════════════════════════════════
  events: {
    trigger(eventKey) {
      if (STATE.data.events.hasOwnProperty(eventKey)) {
        STATE.data.events[eventKey] = true;
      }
    },
    has(eventKey) {
      return STATE.data.events[eventKey] === true;
    },
  },

  // ══════════════════════════════════════════════════════
  // 存档（localStorage）
  // ══════════════════════════════════════════════════════
  save: {
    KEY: 'otr_save_v2', // v2: gallery only saves selected images

    // 幽灵行程根治（用户实测：日历事件被写进 2028-12，读档清扫删了又从云端/存档复活）。
    // 在【写存档】这唯一出口剥掉荒谬年份的日历键——本地和随后推给云端的副本一次就彻底干净、不再复活。
    // 用"±2年窗口"判定：游戏总长只有 360 天(<1年)，任何比锚点年份早1年以上或晚2年以上的日期键必是写错的。
    // 锚点年份取 rtStartDate 的年份，缺失则取真实今天——即使锚点偏了几个月，±2年窗口也绝不会误删真实行程。
    _stripGhostEvents() {
      try {
        var ev = STATE.data && STATE.data.calendar && STATE.data.calendar.events;
        if (!ev) return 0;
        var baseY;
        var rs = STATE.data.rtStartDate;
        if (rs && /^\d{4}-/.test(rs)) baseY = parseInt(rs.slice(0, 4), 10);
        if (!baseY || baseY < 2020 || baseY > 2100) baseY = new Date().getFullYear();
        var lo = (baseY - 1) + '-01-01', hi = (baseY + 2) + '-01-01';
        var killed = 0, killedKeys = [];
        Object.keys(ev).forEach(function (k) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || k < lo || k >= hi) {
            // 把【删了什么】原样记下来：用户实测存档 15 条→重登只剩 5 条，必须钉死是哪些键被清掉、
            // 里面装的是不是真行程（是=清扫误杀，不是=确实有人在写垃圾键）
            killedKeys.push(k + ' [' + ((ev[k] || []).map(function (e) { return (e && (e.id || e.title)) || '?'; }).join(', ') || '空') + ']');
            delete ev[k]; killed++;
          }
        });
        if (killed) { try { console.warn('[OTR] 存档时剥离越界日期键 ×' + killed + '（窗口 ' + lo + '~' + hi + '）→ ' + killedKeys.join(' | ')); } catch (e) {} }
        return killed;
      } catch (e) { return 0; }
    },
    saveGame() {
      try {
        this._stripGhostEvents(); // 写档前先剥幽灵：本地+云端一次性干净
        localStorage.setItem(this.KEY, JSON.stringify(STATE.data));
        return true;
      } catch (e) {
        console.warn('Save failed:', e);
        return false;
      }
    },

    loadGame() {
      try {
        const saved = localStorage.getItem(this.KEY);
        if (!saved) return false;
        const parsed = JSON.parse(saved);
        // 深合并，保留新字段的默认值。
        // ⚠️ 必须原地合并（不能 STATE.data = merged 替换引用）：index.html 里
        // `const G = STATE.data` 在脚本解析时就捕获了引用，替换引用会导致 G 和
        // STATE.data 指向两个不同对象——游戏主逻辑(G)永远是新档，而好感度/记忆
        // (STATE.data)却载入了旧档，进度既救不回来也存不进去（v10.51 修复）
        const merged = this._deepMerge(STATE.data, parsed);
        Object.keys(STATE.data).forEach(k => delete STATE.data[k]);
        Object.assign(STATE.data, merged);
        this._stripGhostEvents(); // 读档后立即剥幽灵（含云端恢复带回来的），并入内存前彻底清掉
        return true;
      } catch (e) {
        console.warn('Load failed:', e);
        return false;
      }
    },

    clearSave() {
      localStorage.removeItem(this.KEY);
    },

    _deepMerge(target, source) {
      const result = { ...target };
      for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this._deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
      return result;
    },
  },

  // ══════════════════════════════════════════════════════
  // 初始化
  // ══════════════════════════════════════════════════════
  init() {
    // 先快照一份纯净默认值（loadGame 之前），供"新的开始"重置用
    this._defaults = JSON.parse(JSON.stringify(this.data));
    // 尝试加载存档
    this.save.loadGame();
    return this;
  },

  // 重置为全新游戏状态（清除存档 + 原地恢复默认值）
  // 注意：index.html 里 `const G = STATE.data` 是直接引用，
  // 所以必须原地清空再填充，不能整体替换 this.data
  reset() {
    const fresh = JSON.parse(JSON.stringify(this._defaults || this.data));
    Object.keys(this.data).forEach(k => delete this.data[k]);
    Object.assign(this.data, fresh);
    this.save.clearSave();
  },
};

// 浏览器环境使用
if (typeof module !== 'undefined') module.exports = STATE;
