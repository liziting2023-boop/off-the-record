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

    // 图片风格
    imgStyle: 'illustrated',

    // 音效
    soundOn: true,

    // 游戏进度
    day: 1,
    fame: 5,
    daysWithoutWork: 0,
    publicSceneCount: 0, // 侦探出现计数

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
    },

    // 公寓
    apartment: {
      livingDayUrl: null,
      livingNightUrl: null,
      selectedStyle: null,
      selectedLayout: null,
    },

    // 日历（日期字符串 'YYYY-MM-DD' -> 当天事件数组）
    calendar: {
      events: {},
    },

    // 每个NPC独立存储（互不干扰）
    npcs: {
      agent: {
        origin: null,        // 玩家选择的族裔
        name: null,          // AI生成的名字
        portraitUrl: null,   // 玩家选择的肖像
        relationship: 30,    // 初始好感度：合约关系，有基础但有距离
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
        relationship: 35,    // 初始好感度：傲慢外表下已经注意到她了
        met: false,
        memory: [],
        currentMood: 'dismissive',
      },
      actor: {
        origin: null,
        name: null,
        portraitUrl: null,
        relationship: 15,    // 初始好感度：魅力攻势，一见就撩
        met: false,
        memory: [],
        currentMood: 'charming',
      },
      detective: {
        origin: null,
        name: null,
        portraitUrl: null,
        relationship: 0,     // 初始好感度：完全陌生，背景出现
        met: false,
        memory: [],
        currentMood: 'professional',
      },
      butler: {
        origin: null,
        name: null,
        portraitUrl: null,
        relationship: 20,    // 初始好感度：温暖亲切，一见如故
        met: false,
        memory: [],
        currentMood: 'warm',
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
        `Naturally beautiful 23-year-old young woman`,
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
        app.hair,
        `${app.skin} skin tone`,
        app.suit,
        `cold composed expression with hidden intensity`,
        `NO glasses`,
        scene,
      ].filter(Boolean).join(', ');
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
        `${app.hair} tousled`,
        `${app.skin} skin`,
        `casual dark clothing, band tee or leather jacket`,
        `strong capable hands, slightly edgy style`,
        `evaluating smoldering expression`,
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
        `${app.hair} perfectly styled`,
        `${app.skin} skin`,
        `fashionable stylish outfit`,
        `effortlessly charismatic expression`,
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
        app.hair,
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
      const origin = npc.origin || 'Korean';
      const app = STATE.imagePrompts.npcAppearance[origin] || STATE.imagePrompts.npcAppearance['Korean'];
      // Day < 210: 可能戴眼镜隐藏眼神
      // Day >= 210: 秘密揭露后摘掉眼镜
      const glassesNote = (!secretRevealed && day < 210 && Math.random() > 0.6)
        ? 'wearing plain glasses to hide resemblance to his brother'
        : 'NO glasses, earnest warm eyes';

      return [
        `Adorable yet handsome 20-year-old ${origin} young man`,
        app.features,
        `172cm slim youthful build`,
        `building manager`,
        `${app.hair} clean and neat`,
        `${app.skin} skin`,
        `casual everyday clothes, neat and unassuming`,
        `clean-cut innocent features, slightly flushed cheeks`,
        `earnest warm expression`,
        `NO backpack, NO bag, hands empty`,
        glassesNote,
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

      // Add character's own culture note from story.js
      const charCulture = char.culture || '';

      return `You are ${npc.name || 'this character'}, ${char.age} years old, ${origin || 'Western'} background.
Role: ${char.profession}.
Core personality: ${personality}.
${charCulture ? 'Character culture: ' + charCulture : ''}
${culturalNote}
Chapter: ${chapter}/12. Relationship with ${playerName}: ${relationship}/100.
Emotional state this chapter: ${emotionalState}.
Previous interactions you remember:
${memorySummary}
${additionalContext ? 'Current context: ' + additionalContext : ''}
Respond in: ${lang}.
Stay completely in character. Let your cultural background subtly influence how you speak — not as a stereotype, but as authentic texture.`;
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
      npc.relationship = Math.max(0, Math.min(100, npc.relationship + delta));
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
        // 深合并，保留新字段的默认值
        STATE.data = this._deepMerge(STATE.data, parsed);
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
    // 尝试加载存档
    this.save.loadGame();
    return this;
  },
};

// 浏览器环境使用
if (typeof module !== 'undefined') module.exports = STATE;
