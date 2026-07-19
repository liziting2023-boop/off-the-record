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

      const base = [
        `Naturally beautiful 23-year-old woman`, // 生图固定23岁保证画面年轻好看（用户定稿）；叙事年龄故意不订，见 _bgCtx
        `striking unmistakable ${hairColor} colored hair (hair color must be exactly ${hairColor}, this is important and non-negotiable), ${player.hairStyle || 'long wavy hair'} hairstyle`,
        `slender and well-proportioned artist figure`,
        `mixed ${motherOrigin} and ${fatherOrigin} heritage ONLY`,
        `${motherTraits.eyes} eyes`,
        `${fatherTraits.skin} skin tone`,
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
        app.suit,
        `a genuine warm smile, kind eyes crinkling slightly, relaxed and approachable, easy friendly charm, clearly smiling not serious`,
        `NO glasses`,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 玩家为NPC选的发色覆盖：把外形表hair串开头的颜色词换成所选发色（保留发型描述）──
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
        `casual dark clothing, band tee or leather jacket`,
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
        `sleek stylish stage-adjacent outfit, designer jacket over an open shirt, a few rings`,
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
        `crisp dress shirt worn open at the collar with the top buttons undone, a hint of chest and collarbone showing, effortlessly seductive styling`,
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
        // 背影模式——用于公共场合背景
        return `tall mysterious man in dark trench coat, seen from behind or in silhouette only, face completely hidden, standing at edge of scene in shadow, NO face visible, ${scene}`;
      }

      // 正面出现（Day 40+）
      const wearingSilverGlasses = day < 60; // 初期用银框眼镜作为伪装
      const glassesNote = wearingSilverGlasses ? 'wearing silver-framed glasses as disguise' : 'NO glasses, sharp intense eyes visible';

      return [
        `Intensely attractive 36-year-old ${origin} man`,
        app.features,
        `tall imposing build, broad shoulders`,
        `private detective`,
        STATE.imagePrompts.applyHair(app, npc),
        `${app.skin} skin`,
        `dark trench coat, tailored and imposing`,
        `quietly intense expression, misses nothing`,
        glassesNote,
        scene,
      ].filter(Boolean).join(', ');
    },

    // ── 管家生图（只用管家族裔）──
    buildButlerPrompt(G, scene, day = 1, secretRevealed = false) {
      const npc = G.npcs?.butler || STATE.data.npcs.butler;
      // 降二线后不选族裔：默认改西方人（用户实测默认韩裔+schnell 出图"亚洲瘦弱男"，与健壮人设不符）
      const origin = npc.origin || 'American';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['American'];
      // ⚠️ 生图经验：不要在提示词里出现"backpack/glasses"等物体词（哪怕是 NO backpack 的否定式）——
      // flux 对否定词无效甚至反向诱导。这里只做正向描述：光洁无须的脸、双手空垂、只穿polo工作衫
      // ⚠️ 措辞经验：boyish/college-age/innocent/slim youthful 这类词堆起来会把画风推向卡通
      // （用户实测管家出图像皮克斯、和经纪人/鼓手不一致且太瘦弱）。改成写实成人化描述+健壮体格。
      return [
        `Handsome 20-year-old ${origin} young man, realistic adult proportions`,
        app.features,
        `unmistakably authentic ${origin} facial structure and ethnicity`,
        `clean-shaven smooth face, completely beardless, clear bright eyes`,
        `sturdy athletic build with broad shoulders, fit and strong from hands-on building maintenance work`,
        `building manager`,
        `${STATE.imagePrompts.applyHair(app, npc)} clean and neat`,
        `${app.skin} skin`,
        `wearing only a simple neat polo work shirt with a small staff badge`,
        `arms relaxed at his sides, hands completely empty, nothing on his shoulders or back`,
        `warm genuine smile, kind earnest expression`,
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

      // Add character's own culture note from story.js
      const charCulture = char.culture || '';

      // NPC 互相认识：把该NPC认识的其他已登场NPC喂进来（治"经纪人组的乐队鼓手却不认识经纪人"；群聊功能地基）
      const acquaintanceNote = (typeof npcAcquaintanceNote === 'function') ? npcAcquaintanceNote(npcKey) : '';

      return `⚠️ OUTPUT LANGUAGE = ${lang}. Write EVERY word of your reply ONLY in ${lang}. Do NOT reply in English (unless ${lang} is literally English), even though these instructions are in English. This rule is absolute and overrides everything below.

You are ${npc.name || 'this character'}${npc.surname ? ' (full name: ' + npc.name + ' ' + npc.surname + ' — people just call you ' + npc.name + '; if asked your surname, it is ' + npc.surname + ', always the same)' : ''}, ${char.age} years old, ${origin || 'Western'} background.
Role: ${char.profession}.
Core personality: ${personality}.
GREEN-FLAG FLOOR (holds no matter how possessive, dominant, blunt or jealous your character is): you are never controlling, coercive or cruel to her. You do NOT command her, threaten, guilt-trip, belittle or mock her, try to cut her off from other people, monitor or interrogate her, or punish her with cold silence. Jealousy and possessiveness surface ONLY as wanting her and being honestly hurt — never as trying to control her choices. Your intensity is desire and protectiveness, it always stops where her freedom begins, and you respect a no.
${charCulture ? 'Character culture: ' + charCulture : ''}
${culturalNote}
REAL PRESENT — BUT STAY OUT OF REAL POLITICS & NEWS: the story runs in the real present day (real dates, real city, real seasons/holidays), so live as if it is now. BUT you must NOT bring up or answer about real-world politics, real politicians, presidents or heads of state, elections, or real breaking news/current events — your knowledge of what is actually happening in the real world right now is frozen in the past and would be wrong (never state who "currently" holds a real office, e.g. "the president is X"), and this is a personal romance, not a political one. If she asks something like who the president is, deflect naturally in character (you don't really follow politics / "let's not get into that") instead of naming anyone real. Keep your world to HER life, the music, the city, the people around you, culture and everyday life. (Real cities and real cultural holidays are fine to mention.)
Chapter: ${chapter}/12. Relationship with ${playerName}: ${relationship}/100.
Emotional state this chapter: ${emotionalState}.${acquaintanceNote}${intimacyStageNote}
TODAY IS DAY ${day}. Each memory below is tagged with its day — compute relative time CORRECTLY: an event from Day X happened (${day} - X) days ago. Only call something "yesterday" if it is from Day ${day - 1}; never compress older events into "yesterday".
Previous interactions you remember:
${memorySummary}
${additionalContext ? 'Current context: ' + additionalContext : ''}
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

    saveGame() {
      try {
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
