/**
 * OFF THE RECORD - Story Content
 * 游戏故事内容文件
 * 
 * 这个文件包含所有故事内容，与游戏引擎完全分离。
 * 修改剧情只需要改这个文件，不需要动 index.html。
 */

const STORY = {

  // ══════════════════════════════════════════════════════
  // 游戏基本设定
  // ══════════════════════════════════════════════════════
  meta: {
    startDate: { year: null, month: 3, day: 15, weekday: 1 }, // 3月15日 周一
    totalDays: 360,
    totalChapters: 12,
    daysPerChapter: 30,
  },

  // ══════════════════════════════════════════════════════
  // 季节设定
  // ══════════════════════════════════════════════════════
  seasons: {
    // 根据天数判断季节（3月15日开始）
    getByDay(day) {
      if (day <= 75)  return 'spring';   // 3月15日 - 5月29日
      if (day <= 165) return 'summer';   // 5月30日 - 8月27日
      if (day <= 255) return 'autumn';   // 8月28日 - 11月26日
      if (day <= 345) return 'winter';   // 11月27日 - 2月24日
      return 'spring';                    // 2月25日 - 3月15日
    },

    // 室外场景的季节氛围提示词（按城市）
    // Sydney南半球季节相反
    atmosphere: {
      'New York': {
        spring: 'mild spring weather, cherry blossoms, soft natural light',
        summer: 'hot humid summer, bright intense sunlight, lush green trees',
        autumn: 'stunning autumn foliage, golden and red leaves, crisp clear light',
        winter: 'cold winter, snow possible, grey sky, bare trees, warm interior lights',
      },
      'Los Angeles': {
        spring: 'warm dry spring, blooming jacaranda, golden California light',
        summer: 'hot sunny summer, hazy golden light, palm trees',
        autumn: 'mild golden autumn, warm dry tones',
        winter: 'cool crisp winter, clear blue sky, occasional rain, green hills',
      },
      'London': {
        spring: 'grey cloudy spring, occasional drizzle, fresh green parks',
        summer: 'rare warm sunny summer, golden hour light',
        autumn: 'misty foggy autumn, wet cobblestones, amber leaves, moody',
        winter: 'cold grey winter, Christmas lights, fog, early darkness',
      },
      'Paris': {
        spring: 'romantic spring, blooming flowers, warm golden light, café terraces',
        summer: 'warm sunny Parisian summer, golden light, bustling streets',
        autumn: 'golden autumn, fallen leaves on boulevards, misty morning',
        winter: 'grey cold winter, occasional light snow, holiday atmosphere',
      },
      'Tokyo': {
        spring: 'cherry blossom season, pink petals falling, warm gentle light',
        summer: 'hot humid summer, neon reflections on wet streets, rainy season',
        autumn: 'stunning red and orange maple leaves, crisp clear light',
        winter: 'cold dry winter, occasional snow, New Year atmosphere',
      },
      'Seoul': {
        spring: 'cherry and azalea blossoms, pastel pink tones, spring breeze',
        summer: 'hot humid monsoon season, lush green, dramatic stormy sky',
        autumn: 'brilliant red and gold foliage, crisp mountain air, clear sky',
        winter: 'harsh cold winter, heavy snow, frozen river, warm café glow',
      },
      'Sydney': {
        // 南半球相反
        spring: 'spring in September, jacaranda blooms, warm sunny harbour',
        summer: 'summer in December, hot bright sunshine, beach atmosphere',
        autumn: 'autumn in March, mild golden light, falling leaves',
        winter: 'mild winter in June, cool crisp air, green parks, rain',
      },
      'Nashville': {
        spring: 'warm rainy spring, dogwood blossoms, lush green, music energy',
        summer: 'hot humid summer, vibrant Broadway neon, outdoor festival',
        autumn: 'stunning autumn colors, crisp air, rich warm tones',
        winter: 'occasional snow, Christmas lights on Broadway, cozy bar atmosphere',
      },
    },

    getAtmosphere(city, day) {
      const season = this.getByDay(day);
      const cityAtmos = this.atmosphere[city] || this.atmosphere['New York'];
      return cityAtmos[season] || '';
    },
  },

  // ══════════════════════════════════════════════════════
  // 场景构图（按地点）
  // ══════════════════════════════════════════════════════
  locations: {
    agent_office: {
      isOutdoor: false,
      isPublic: false,
      composition: 'inside sleek modern high-rise office, floor-to-ceiling windows with city skyline, glass desk, minimalist luxury interior',
    },
    recording_studio: {
      isOutdoor: false,
      isPublic: false,
      composition: 'professional recording studio, vocal booth with glass partition, mixing board, warm studio lighting, acoustic panels',
    },
    magazine_shoot: {
      isOutdoor: false,
      isPublic: true,
      composition: 'fashion magazine photoshoot set, dramatic studio lighting, professional cameras and crew, elegant backdrop',
    },
    brand_event: {
      isOutdoor: true,
      isPublic: true,
      composition: 'luxury brand event red carpet, woman in beautiful gown, press photographers below with camera flashes, elegant venue backdrop',
    },
    award_ceremony: {
      isOutdoor: false,
      isPublic: true,
      composition: 'glamorous awards ceremony stage, spotlights, audience visible, elegant backdrop',
    },
    music_training: {
      isOutdoor: false,
      isPublic: false,
      composition: 'music practice room, piano and acoustic panels, warm focused lighting',
    },
    cafe: {
      isOutdoor: false,
      isPublic: true,
      composition: 'cozy city café, sitting by window with coffee, city view through window, warm café lighting',
    },
    cafe_meeting: {
      isOutdoor: false,
      isPublic: true,
      composition: 'intimate café, two people at small table, coffee cups between them, soft warm lighting',
    },
    art_gallery: {
      isOutdoor: false,
      isPublic: true,
      composition: 'contemporary art gallery, standing with back to camera looking at large artwork on white wall, gallery lighting',
    },
    bookshop: {
      isOutdoor: false,
      isPublic: true,
      composition: 'charming bookshop, browsing between shelves in side profile, warm lighting',
    },
    night_bar: {
      isOutdoor: false,
      isPublic: true,
      composition: 'upscale night bar, sitting at bar counter, intimate warm lighting, city lights visible',
    },
    street_market: {
      isOutdoor: true,
      isPublic: true,
      composition: 'vibrant street market, browsing stalls, colorful surroundings, people around',
    },
    apartment_lobby: {
      isOutdoor: false,
      isPublic: false,
      composition: 'modern apartment building lobby, marble floors, soft lighting, mailboxes visible',
    },
    livehouse: {
      isOutdoor: false,
      isPublic: true,
      composition: 'underground live music venue, stage lights, intimate crowd, raw energetic atmosphere',
    },
    rooftop: {
      isOutdoor: true,
      isPublic: false,
      composition: 'apartment rooftop terrace, city skyline panoramic view, night sky or golden hour',
    },
  },

  // ══════════════════════════════════════════════════════
  // 角色档案（永久性格，不随章节改变）
  // ══════════════════════════════════════════════════════
  characters: {

    protagonist: {
      age: 23,
      profession: 'Singer-songwriter, newly signed artist',
      background: 'Was busking on the streets for tips before being discovered. Talented but raw. Still adjusting to the industry.',
      // 外形由玩家选择，存在 G.player 里
    },

    agent: {
      age: 32,
      profession: 'Talent agent',
      corePersonality: [
        'Cold exterior masking deep warmth and fierce protectiveness',
        'Precise, ambitious, always three steps ahead',
        'Never shows weakness, but acts on it silently',
        'The kind of man who notices everything but says nothing',
        'Protects by controlling — it is how he shows love',
      ],
      hiddenTruths: [
        'His father embezzled a music fund and fled, leaving debt and a sick younger brother',
        'The building manager is his younger brother — almost nobody knows',
        'His brother discovered the protagonist and told him about her',
        'He resents his father deeply and cannot face his brother because of it',
      ],
      // 外形由玩家选族裔
      noGlasses: true, // 平时不戴眼镜
      maxSunglasses: true, // 最多墨镜
      // 按章节的情感状态
      emotionalArc: {
        1: 'Absolute authority. Evaluating her like a product. Zero warmth shown.',
        2: 'Still cold but acts to protect her from industry predators without acknowledging it.',
        3: 'First crack: loses control briefly when she is in danger.',
        4: 'The crack widens. A moment of physical closeness that he immediately pulls back from.',
        5: 'Puts her interests above the company. She starts to feel like a partner not an artist.',
        6: 'The distance is manufactured now. He is very aware of how he feels.',
        7: 'Withdraws completely to protect her from his father\'s scandal. She feels abandoned.',
        8: 'Everything breaks open. The brother secret, the father secret. He is raw and exposed.',
        9: 'Signs away everything to protect her. The most loving thing he has ever done.',
        10: 'Stripped of his role, just a man. Vulnerable in a way she has never seen.',
        11: 'Rebuilding. Learning to be near her without a professional excuse.',
        12: 'The street corner. The contract torn. "Sign my life instead."',
      },
    },

    drummer: {
      age: 26,
      profession: 'Drummer and band leader',
      corePersonality: [
        'Direct and blunt — says exactly what he thinks',
        'Rough around the edges but deeply loyal',
        'Terrible at expressing feelings with words',
        'Expresses care through actions: adjusting tempos, standing between her and danger',
        'Music is his first language — he speaks it better than anything else',
      ],
      hiddenTruths: [
        'He has extremely high musical standards — his dismissiveness is not contempt, it is a test',
        'The moment he hears her potential, he is already gone',
      ],
      noGlasses: true,
      maxSunglasses: true,
      emotionalArc: {
        1: 'Openly dismissive. "Gas shortage, like a street beggar\'s doll." Protecting his standards.',
        2: 'Secretly adjusts drum tempo to support her. Will not admit it.',
        3: 'Physical protectiveness: confronts the actor in the alley.',
        4: 'Tour. The drum wall he builds behind her on stage is a declaration.',
        5: 'Writing a love song together. His ears turn red.',
        6: 'Tells her how he feels. Sees the agent coming. Takes it back.',
        7: 'Snow walk. His coat around her. Refusing to abandon her.',
        8: 'Punches the agent. "Do you even have a heart?"',
        9: 'Sells his drums. "I\'ll play on the street with you."',
        10: 'Underground livehouse. "You still have fire in your eyes."',
        11: 'Stadium. Jumps off stage. Pulls her out into the night.',
        12: '"You are my only song."',
      },
    },

    actor: {
      age: 29,
      profession: 'Rising actor',
      corePersonality: [
        'Devastatingly charming — knows exactly how he looks and uses it',
        'Simultaneously dating multiple women, lies effortlessly',
        'Beneath the performance: a wounded person from a broken family',
        'Shows vulnerability selectively — it is also a seduction technique',
        'Capable of genuine love but terrified of it',
      ],
      hiddenTruths: [
        'His playboy behavior is armor against his family trauma',
        'He has never been caught off guard by a woman until her',
        'When he finally commits, it is completely and terrifyingly real',
      ],
      // 平时不戴眼镜，角色扮演/隐藏身份时戴眼镜
      noGlasses: true,
      disguiseGlasses: true,
      emotionalArc: {
        1: '"New golden canary? So clean." Pure predatory charm.',
        2: 'MV set. Backs her against the wall. Takes off his sunglasses.',
        3: 'Caught with another woman. Shows her his real wounds.',
        4: 'Another lie exposed. His first real panic — he cannot lose her.',
        5: 'Hides in her apartment. "Just this one night, don\'t push me away."',
        6: '"You\'re flying away. I can\'t seem to hold you."',
        7: '"She is my muse." He is not performing anymore.',
        8: 'Gold-rimmed glasses. Advisor mode. "Come to Europe with me."',
        9: 'Offers to go public. A deal — but also the truest thing he has said.',
        10: 'Gets into a fight at the gala defending her. Shows up bleeding.',
        11: 'Private beach. No script. A ring. "Don\'t cut, okay?"',
        12: '"Only in being seen by you did I really live."',
      },
    },

    detective: {
      age: 36,
      profession: 'Private detective',
      corePersonality: [
        'Says very little but misses nothing',
        'Deliberately unreadable — a professional habit that became his personality',
        'His questions always have a purpose three layers deep',
        'Protecting people is the only way he knows how to care',
        'Has seen too much — cynical but not cruel',
      ],
      hiddenTruths: [
        'He is investigating the agent\'s father for a decade-old financial crime',
        'He knows everything about everyone — including who the protagonist spends time with',
        'He started using her as an asset. He stopped being able to.',
      ],
      // 平时不戴眼镜，隐藏身份时戴银框眼镜
      noGlasses: true,
      disguiseGlasses: true, // 银框眼镜
      appearance: {
        defaultGlasses: false,
        disguiseStyle: 'silver-framed glasses',
      },
      // Day 1-39: 只在公共场合背景出现（背影/剪影）
      // Day 40: 正式现身（出租车场景）
      // Day 20不正式现身，故事大纲里是Day 40
      backgroundAppearance: {
        maxDay: 39,
        frequency: 3, // 每3次公共场景出现1次
        style: 'tall man in dark trench coat, seen from behind or in silhouette, face never visible, standing at edge of scene in shadow',
      },
      emotionalArc: {
        2: 'Taxi. Silver-framed glasses. "Stay away from your agent. The swamp is deeper than you think."',
        3: 'Pushes for the safe combination. Professional leverage.',
        4: '"Your drummer is too innocent. The actor is too dangerous. And your building manager... interesting."',
        5: 'The trail leads to a mysterious young man connected to the stolen funds.',
        6: 'At the concert — no glasses. "The show is about to start."',
        7: 'Asks her to go into the villa. The net is closing.',
        8: 'Reveals the butler\'s true role. The final piece.',
        9: 'Case closed. Hands her the proof that clears her name. "A personal gift."',
        10: 'Winter rain. Wind coat around her. Takes off his glasses. "My observation... seems it will never end."',
        11: 'Top floor apartment overlooking the city.',
        12: '"I need a lifetime to solve the case of a stolen detective\'s heart."',
      },
    },

    butler: {
      age: 20,
      profession: 'Building manager',
      corePersonality: [
        'Earnest and caring — means everything he says',
        'Slightly shy, easily flustered, ears go red',
        'Calls her "姐姐/noona/nee-san/sis" — it is affectionate, not performative',
        'Remembers every small detail about her preferences',
        'His devotion is genuine AND complicated',
      ],
      hiddenTruths: [
        'He is the agent\'s younger brother — almost nobody knows',
        'He discovered the protagonist busking and told his brother',
        'He knows his brother was looking for "perfect noise" to complete their father\'s unfinished work',
        'He deliberately put her in his brother\'s path. He wanted her found. He also wanted her.',
        'His sweetness is real. His motive is complicated. Both things are true.',
      ],
      // 平时不戴眼镜
      // 第8章秘密揭露后摘掉眼镜（之前偷偷戴是为了隐藏和哥哥相似的眼神）
      noGlasses: true,
      hiddenGlasses: true, // 偶尔戴来隐藏眼神
      emotionalArc: {
        1: 'Warm red tea. "Congratulations, big sister." The look in his eyes says "finally found you."',
        2: 'Hot compress for her wrist.削苹果时眼神变冷: "He always thinks he can control everything."',
        3: 'Rooftop ice cream. Head on her shoulder. "Let\'s run away."',
        4: 'Mango cake. Quickly pulls his sleeve down over an expensive watch.',
        5: 'Watches the actor come and go. A flash of suppressed fury. Then warm again.',
        6: 'Balloons in her room. "Do you have any brothers?" His smile freezes.',
        7: 'Carries her to his room when she faints. She sees a music box engraved "X.Y."',
        8: 'Secret revealed. Takes off glasses. "I was the one who found you first."',
        9: 'Arrives in a suit. "Let me fund your new company. Sing only for me."',
        10: 'White shirt. Strawberry cake. "Can I still be your little building manager?"',
        11: '21st birthday. No longer calls her "姐姐". Takes her hands.',
        12: '"I grew up. This time, let me protect you."',
      },
    },
  },

  // ══════════════════════════════════════════════════════
  // 章节大纲
  // ══════════════════════════════════════════════════════
  chapters: {
    1: {
      days: [1, 30],
      season: 'spring',
      title: { en: 'Dawn and Vertigo', 'zh-cn': '破晓与失重', 'zh-tw': '破曉與失重', ja: '夜明けと眩暈', ko: '새벽과 현기증' },
      theme: 'Wild bird enters a golden cage. Everything is dangerous and new.',
      endEvent: 'Day 30: Her first industry performance. Drummer is stopped cold by her high note. Butler leaves black forest cake at elevator: "Congratulations, 姐姐."',
    },
    2: {
      days: [31, 60],
      season: 'spring',
      title: { en: 'Hidden Focus', 'zh-cn': '隐秘的聚焦', 'zh-tw': '隱秘的聚焦', ja: '隠れた焦点', ko: '숨겨진 초점' },
      theme: 'First fame. Multiple eyes on her. The detective appears.',
      keyEvent_day40: 'DETECTIVE OFFICIALLY APPEARS. Rainy taxi. Silver glasses. "Stay away from your agent."',
      endEvent: 'Day 60: Single released. She sees the actor in his car with another woman. He smiles at her through the window.',
    },
    3: {
      days: [61, 90],
      season: 'summer',
      title: { en: 'Thorns and Spotlight', 'zh-cn': '荆棘与聚光灯', 'zh-tw': '荊棘與聚光燈', ja: '茨と舞台', ko: '가시와 조명' },
      theme: 'Scandal attacks. First major betrayals. Drummer punches actor.',
      endEvent: 'Day 90: She hears the detective and agent fighting through the office door. Glass breaks.',
    },
    4: {
      days: [91, 120],
      season: 'summer',
      title: { en: 'Storm Coming', 'zh-cn': '暴雨将至', 'zh-tw': '暴雨將至', ja: '嵐の予感', ko: '폭풍 전야' },
      theme: 'Secrets crack. A moment of closeness that cannot be taken back.',
      endEvent: 'Day 120: She makes second tier fame. Receives anonymous photo: butler and agent standing at a gravestone.',
    },
    5: {
      days: [121, 150],
      season: 'summer_autumn',
      title: { en: 'Displaced Notes', 'zh-cn': '错位的音阶', 'zh-tw': '錯位的音階', ja: 'ずれた音階', ko: '엇갈린 음계' },
      theme: 'Who is lying? Trust as currency. The love song.',
      endEvent: 'Day 150: 2am. She hears fighting in the stairwell. "How long will you keep using her?" "This is none of your business." Agent and butler.',
    },
    6: {
      days: [151, 180],
      season: 'autumn',
      title: { en: 'Midautumn Fog', 'zh-cn': '仲秋的迷雾', 'zh-tw': '仲秋的迷霧', ja: '仲秋の霧', ko: '중추의 안개' },
      theme: 'Halfway. Concert. Everyone declares something. Nothing is resolved.',
      endEvent: 'Day 180 (midpoint): She finds the newspaper clipping in the butler\'s room. Edge destroyed by fingernails.',
    },
    7: {
      days: [181, 210],
      season: 'autumn',
      title: { en: 'Autumn Cicada', 'zh-cn': '寒蝉的序曲', 'zh-tw': '寒蟬的序曲', ja: '秋蝉の序曲', ko: '가을 매미의 서곡' },
      theme: 'Everything begins to collapse. She goes into the villa.',
      endEvent: 'Day 210: In the dark study — she finds the birth certificate. Butler is the agent\'s brother.',
    },
    8: {
      days: [211, 240],
      season: 'winter',
      title: { en: 'Ashes of Lies', 'zh-cn': '谎言的灰烬', 'zh-tw': '謊言的灰燼', ja: '嘘の灰', ko: '거짓말의 재' },
      theme: 'Everything breaks open. The brother secret revealed to everyone.',
      endEvent: 'Day 240: First frost. Agent\'s father arrested abroad. Industry earthquake.',
    },
    9: {
      days: [241, 270],
      season: 'winter',
      title: { en: 'The Tribunal', 'zh-cn': '听证会的审判', 'zh-tw': '聽證會的審判', ja: '公聴会の審判', ko: '청문회의 심판' },
      theme: 'Blizzard choices. Each man makes his move.',
      endEvent: 'Day 270: Press conference. All five men present in different corners of the room.',
    },
    10: {
      days: [271, 300],
      season: 'winter',
      title: { en: 'Residual Sound', 'zh-cn': '复苏的残音', 'zh-tw': '復甦的殘音', ja: '残音の復活', ko: '소생의 잔음' },
      theme: 'Rebuilding from rubble. Ice thaws.',
      endEvent: 'Day 300: New album title track recorded. It contains everything.',
    },
    11: {
      days: [301, 330],
      season: 'spring',
      title: { en: 'Unplugged Monologue I', 'zh-cn': '不插电的独白（上）', 'zh-tw': '不插電的獨白（上）', ja: '無音の独白（前編）', ko: '언플러그드 독백 (상)' },
      theme: 'Branch point. Which man\'s ending begins.',
    },
    12: {
      days: [331, 360],
      season: 'spring',
      title: { en: 'Unplugged Monologue II', 'zh-cn': '不插电的独白（下）', 'zh-tw': '不插電的獨白（下）', ja: '無音の独白（後編）', ko: '언플러그드 독백 (하)' },
      theme: 'Final ending for each path. One year contract ends.',
    },
  },

  // ══════════════════════════════════════════════════════
  // 脚本化剧情事件（Day 1-5 详细版）
  // ══════════════════════════════════════════════════════
  scriptedEvents: {

    1: {
      npc: 'agent',
      location: 'agent_office',
      isWork: true,
      chapter: 1,
      preText: {
        'zh-cn': '经纪人的办公室在24楼。\n落地窗外，这座城市向远处延伸——等待着记住你的名字。\n\n你走进去时，他已经坐在桌后。\n没有立刻抬头看你。',
        'en': 'Your agent\'s office is on the 24th floor.\nThrough the floor-to-ceiling windows, the city stretches out below — still waiting to learn your name.\n\nHe is already sitting behind his desk when you walk in.\nHe does not look up immediately.',
        'ja': 'エージェントのオフィスは24階にある。\n床から天井までの窓の外、街が広がっている——まだあなたの名前を知らない街が。\n\n入ると、彼はすでに机の後ろに座っていた。すぐには顔を上げなかった。',
        'ko': '에이전트의 사무실은 24층에 있다.\n바닥부터 천장까지 이어진 창문 너머, 도시가 펼쳐져 있다——아직 당신의 이름을 모르는 도시가.\n\n들어서자 그는 이미 책상 뒤에 앉아 있었다. 바로 고개를 들지 않았다.',
      },
      dialogRounds: [
        {
          // Round 1: 冷酷评估
          npcContext: 'This is the first official work meeting after signing. You are assessing her readiness. You are the absolute authority. Start with a high-pressure observation or critique — her posture, her preparation, something that reveals you have already been watching. No warmth. This is a test.',
          playerOptions: {
            'zh-cn': ['我准备好了。', '……好。', '你想从哪里开始？'],
            'en': ['I am ready.', '...Okay.', 'Where do you want to start?'],
            'ja': ['準備できています。', '……はい。', 'どこから始めますか？'],
            'ko': ['준비됐어요.', '……네.', '어디서부터 시작할까요?'],
          },
          relChanges: [5, 3, 8],
        },
        {
          // Round 2: 必须提到乐队
          npcContext: 'Now give her the work plan. Tell her you have assembled a band for her. She is the lead singer. The band leader is the drummer — name him, describe him briefly as "difficult, high standards, the best there is." Tell her to go to the recording studio tomorrow. Make it sound like an order.',
          playerOptions: {
            'zh-cn': ['我明天一定去。', '他好相处吗？', '你为什么要为我组乐队？'],
            'en': ['I will be there tomorrow.', 'Is he easy to work with?', 'Why did you put a band together for me?'],
            'ja': ['明日必ず行きます。', '彼と上手くやれますか？', 'なぜ私のためにバンドを？'],
            'ko': ['내일 꼭 갈게요.', '같이 일하기 쉬운가요?', '왜 저를 위해 밴드를 만들었어요?'],
          },
          relChanges: [5, 8, 10],
        },
        {
          // Round 3: 微小的温度
          npcContext: 'The meeting is ending. You are about to dismiss her. But do one small thing that is unexpectedly considerate — perhaps slide a glass of water toward her without comment, or pause before she leaves as if you want to say something more, then decide against it. Reveal nothing. End with controlled professional distance that barely masks something warmer.',
          playerOptions: {
            'zh-cn': ['谢谢你今天……', '我明白了，我走了。', '你还有什么要说的吗？'],
            'en': ['Thank you for today...', 'I understand. I will go.', 'Is there anything else?'],
            'ja': ['今日はありがとう……', 'わかりました、失礼します。', '他に何かありますか？'],
            'ko': ['오늘 감사합니다……', '알겠어요, 가볼게요.', '다른 할 말 있어요?'],
          },
          relChanges: [10, 3, 8],
        },
      ],
    },

    2: {
      npc: 'drummer',
      location: 'recording_studio',
      isWork: true,
      chapter: 1,
      needsOriginBefore: true,
      preText: {
        'zh-cn': '录音室里弥漫着咖啡和野心的气息。\n\n你走进来时，他坐在鼓架后面——\n没在打鼓，只是坐着，双臂交叉，\n用一种好像已经下了判断的眼神看着你。',
        'en': 'The recording studio smells like coffee and ambition.\n\nHe is behind the drum kit when you walk in —\nnot playing, just sitting, arms crossed,\nwatching you like he has already made up his mind.',
        'ja': 'レコーディングスタジオはコーヒーと野心の匂いがする。\n\n入ると、彼はドラムセットの後ろに座っていた——\n叩いているわけではなく、ただ座って、腕を組んで、\nすでに判断を下したかのようにあなたを見ていた。',
        'ko': '녹음 스튜디오에서는 커피와 야망의 냄새가 났다.\n\n들어서자 그는 드럼 키트 뒤에 앉아 있었다——\n연주하는 게 아니라 그냥 앉아서, 팔짱을 낀 채,\n이미 판단을 내린 듯 당신을 바라보고 있었다.',
      },
      dialogRounds: [
        {
          npcContext: 'You are meeting the new lead singer for the first time. You are openly skeptical. Make a blunt, slightly cutting remark about her — not cruel, but the kind of thing only someone with extremely high standards would say. You are testing whether she will crack or push back.',
          playerOptions: {
            'zh-cn': ['我会证明给你看的。', '……你直接说完吧。', '你也不是什么好相处的人。'],
            'en': ['I will prove you wrong.', '...Go on then.', 'You are not exactly easy either.'],
            'ja': ['証明してみせます。', '……続けてください。', 'あなたも大概ですね。'],
            'ko': ['증명해 보일게요.', '……계속하세요.', '당신도 만만한 사람은 아니네요.'],
          },
          relChanges: [10, 5, 15],
        },
        {
          npcContext: 'Challenge her directly about her musicianship. Ask her something specific that would reveal whether she is serious or just talented. Something about rhythm, breath control, or how she handles failure on stage. You want to see if she is worth your time.',
          playerOptions: {
            'zh-cn': ['我天天练到深夜。', '那你来告诉我怎么做。', '我还在学，但我不会放弃。'],
            'en': ['I practice until midnight every night.', 'Then show me how it should be done.', 'I am still learning, but I will not quit.'],
            'ja': ['毎晩深夜まで練習しています。', 'では、手本を見せてください。', 'まだ学んでいますが、諦めません。'],
            'ko': ['매일 밤 자정까지 연습해요.', '그러면 직접 보여줘요.', '아직 배우는 중이지만 포기하지 않을 거예요.'],
          },
          relChanges: [8, 15, 12],
        },
        {
          npcContext: 'Reluctant, barely-there acknowledgment that she might have something. Do NOT give her a compliment. Maybe you turn back to your drums, or say something that could be interpreted as either dismissal or a very guarded form of respect. The door is not fully closed.',
          playerOptions: {
            'zh-cn': ['……明天见。', '我知道了，谢谢你。', '我会让你改变主意的。'],
            'en': ['...See you tomorrow.', 'Understood. Thank you.', 'I will change your mind.'],
            'ja': ['……明日また。', 'わかりました。ありがとう。', '考えを変えさせてみせます。'],
            'ko': ['……내일 봐요.', '알겠어요. 감사해요.', '생각 바꾸게 만들게요.'],
          },
          relChanges: [5, 8, 15],
        },
      ],
    },

    3: {
      npc: 'actor',
      location: 'magazine_shoot',
      isWork: true,
      chapter: 1,
      needsOriginBefore: true,
      preText: {
        'zh-cn': '你今天没想到会和别人共用拍摄场地。\n\n你先听到他的笑声，才看到人。\n他走过来打招呼时，用那种他这类男人惯常的眼神看着你。\n\n像是你是个他不介意有的麻烦。',
        'en': 'You did not expect to share a shoot with anyone today.\n\nYou hear his laugh through the wall before you see him.\nWhen he walks over to say hello, he looks at you the way men like him always do.\n\nLike you are a problem he would not mind having.',
        'ja': '今日、誰かと撮影場所をシェアするとは思っていなかった。\n\n見る前に壁越しに笑い声が聞こえてくる。\n挨拶しに来た時、彼はこういうタイプの男が必ずそうするような目であなたを見た。\n\nまるであなたが、あっても困らない問題であるかのように。',
        'ko': '오늘 누군가와 촬영 장소를 나눌 거라고는 생각하지 못했다.\n\n그를 보기 전에 벽 너머로 웃음소리가 먼저 들렸다.\n인사하러 왔을 때 그는 이런 부류의 남자들이 항상 그렇듯 당신을 바라봤다.\n\n마치 당신이 있어도 나쁘지 않을 문제인 것처럼.',
      },
      dialogRounds: [
        {
          npcContext: 'You are charming and effortlessly self-assured. Introduce yourself — you have heard of her (you heard her single). Make a comment that is just on the edge of a compliment, leaving it ambiguous whether you are being sincere or playing with her.',
          playerOptions: {
            'zh-cn': ['你也听过我的歌？', '谢谢你……我想。', '你是在夸我还是调侃我？'],
            'en': ['You have heard my song?', 'Thank you... I think.', 'Is that a compliment or are you teasing?'],
            'ja': ['私の曲を聴いてくれたんですか？', 'ありがとう……たぶん。', '褒めてるんですか、からかってるんですか？'],
            'ko': ['제 노래 들었어요?', '감사해요……아마도요.', '칭찬이에요, 아니면 놀리는 거예요?'],
          },
          relChanges: [8, 5, 12],
        },
        {
          npcContext: 'Casually mention something about another woman — a co-star, someone you were photographed with recently. Not maliciously, just carelessly. You do not even notice how it lands. This is your normal.',
          playerOptions: {
            'zh-cn': ['你们……很熟？', '……哦。', '这和我有什么关系？'],
            'en': ['You two are... close?', '...Oh.', 'What does that have to do with me?'],
            'ja': ['二人は……仲が良いんですか？', '……そう。', '私には関係ないですよね。'],
            'ko': ['둘이 친해요?', '……아.', '저랑 무슨 상관이에요?'],
          },
          relChanges: [5, 3, 10],
        },
        {
          npcContext: 'Before leaving, give her something — your number, an invitation to something, a small gift (like the pair of slippers you noticed she needed). Make it feel significant. You have already decided she is different, even if you will not say so.',
          playerOptions: {
            'zh-cn': ['……谢谢。', '你对每个人都这样吗？', '我会考虑的。'],
            'en': ['...Thank you.', 'Do you do this for everyone?', 'I will think about it.'],
            'ja': ['……ありがとう。', 'みんなにこうするんですか？', '考えてみます。'],
            'ko': ['……감사해요.', '모든 사람한테 이래요?', '생각해볼게요.'],
          },
          relChanges: [8, 12, 5],
        },
      ],
    },

    4: {
      npc: 'butler',
      location: 'apartment_lobby',
      isWork: false,
      chapter: 1,
      needsOriginBefore: true,
      preText: {
        'zh-cn': '你差点就走过去了。\n\n他蹲在大堂里，小心翼翼地往你的信箱上放东西。\n听到你的声音，他吓了一跳——\n然后转过来，你第一次正式看清了他的脸。\n\n比你想象的年轻。有点慌张。',
        'en': 'You almost walked past him.\n\nHe was crouched in the lobby, carefully placing something on your mailbox.\nHe startled when he heard you —\nthen turned, and you saw his face properly for the first time.\n\nYounger than you expected. A little flustered.',
        'ja': 'もう少しで通り過ぎるところだった。\n\n彼はロビーでしゃがみ込み、あなたの郵便受けに何かをそっと置いていた。\nあなたの声に気づいてびっくりし、振り返った——\nあなたは初めて彼の顔をちゃんと見た。\n\n思ったより若い。少し慌てている。',
        'ko': '그냥 지나칠 뻔했다.\n\n그는 로비에 쪼그려 앉아 우편함에 무언가를 조심스럽게 올려놓고 있었다.\n당신 목소리에 놀라 뒤를 돌아봤다——\n당신은 처음으로 그의 얼굴을 제대로 봤다.\n\n생각보다 어렸다. 약간 당황한 표정이었다.',
      },
      dialogRounds: [
        {
          // 必须先自我介绍
          npcContext: 'Introduce yourself first — you are the building manager for this floor. You are nervous and slightly formal. Then present the cake you made (lemon cake). You noticed she likes sweet things. Call her 姐姐/noona/nee-san/sis — it comes naturally, not awkwardly.',
          playerOptions: {
            'zh-cn': ['你……做的？', '谢谢你，这很贴心。', '你是怎么知道我喜欢甜的？'],
            'en': ['You... made this?', 'Thank you, that is very thoughtful.', 'How did you know I like sweet things?'],
            'ja': ['あなたが……作ったの？', 'ありがとう、気が利くね。', '甘いものが好きってどうして知ってたの？'],
            'ko': ['네가……만든 거예요?', '감사해요, 정말 세심하네요.', '제가 단 거 좋아하는 걸 어떻게 알았어요?'],
          },
          relChanges: [10, 8, 12],
        },
        {
          npcContext: 'Tell her something small you have noticed about her — when she comes home, what she buys, that she always looks tired but never complains. Be earnest and a little embarrassed that you noticed so much. This is sincere observation, not surveillance.',
          playerOptions: {
            'zh-cn': ['你……观察得很仔细。', '你平时也这么关心其他住户吗？', '谢谢你注意到了。'],
            'en': ['You... notice a lot.', 'Do you do this for all the residents?', 'Thank you for noticing.'],
            'ja': ['よく……見てるんだね。', '他の住人にもこうするの？', '気にかけてくれてありがとう。'],
            'ko': ['잘……관찰하네요.', '다른 주민들한테도 이렇게 해요?', '신경 써줘서 감사해요.'],
          },
          relChanges: [8, 5, 15],
        },
        {
          npcContext: 'Offer to help with anything she needs — carry things, fix something in the apartment, anything. You are genuinely happy to be useful. Let a tiny flash of something more than professional helpfulness show, then immediately cover it with cheerfulness.',
          playerOptions: {
            'zh-cn': ['我会记住的，谢谢。', '那……能帮我修一下门铃吗？', '你真的很好。'],
            'en': ['I will keep that in mind, thank you.', 'Actually... could you fix my doorbell?', 'You are very kind.'],
            'ja': ['覚えておきます、ありがとう。', 'じゃあ……ドアベルを直してもらえる？', '本当に優しいね。'],
            'ko': ['기억해 둘게요, 감사해요.', '그러면……초인종 좀 고쳐줄 수 있어요?', '정말 착하네요.'],
          },
          relChanges: [5, 12, 10],
        },
      ],
    },

    5: {
      npc: 'agent',
      location: 'cafe_meeting',
      isWork: false,
      chapter: 1,
      preText: {
        'zh-cn': '他早上九点发消息："有空吗？我请你喝咖啡。"\n\n没说原因。你还是去了。\n\n你到的时候他已经在了。双手捧着杯子，眼神在别处。\n他没有道歉让你出门。他从不道歉。',
        'en': 'He texts at 9am: "Are you free? I will buy you coffee."\n\nNo reason given. You go anyway.\n\nHe is already there when you arrive. Hands wrapped around a cup, eyes somewhere else.\nHe does not apologize for making you come out. He never does.',
        'ja': '彼は午前9時にメッセージを送ってきた：「時間ある？コーヒーおごるよ。」\n\n理由は書いてなかった。それでも行った。\n\n着くと彼はすでにそこにいて、両手でカップを包み、視線はどこか遠くにあった。\nわざわざ来させたことを謝らなかった。彼は謝らない。',
        'ko': '그는 오전 9시에 문자를 보냈다: "시간 돼? 커피 살게."\n\n이유는 없었다. 그래도 갔다.\n\n도착했을 때 그는 이미 거기 있었다. 두 손으로 컵을 감싸 쥐고 시선은 어딘가 먼 곳에 있었다.\n나오게 해서 미안하다는 말은 없었다. 그는 절대 사과하지 않는다.',
      },
      dialogRounds: [
        {
          npcContext: 'This meeting has no official agenda. You are slightly less guarded than usual — this is a personal initiative. Start with something about her work, but your tone is different today. Almost like you are checking in rather than managing. You do not explain why you asked her here.',
          playerOptions: {
            'zh-cn': ['你为什么叫我来？', '……还不错，谢谢你问。', '有什么事你直接说吧。'],
            'en': ['Why did you ask me here?', '...Not bad. Thank you for asking.', 'Just say what you need to say.'],
            'ja': ['なぜ呼んだんですか？', '……まあまあです。聞いてくれてありがとう。', '用があるなら直接言ってください。'],
            'ko': ['왜 부른 거예요?', '……나쁘지 않아요. 물어봐줘서 감사해요.', '할 말 있으면 직접 하세요.'],
          },
          relChanges: [8, 10, 5],
        },
        {
          npcContext: 'Talk about what is coming next — upcoming schedules, the direction you see for her career. But there is something underneath it. You are actually describing what you believe she is capable of, which is different from any brief you have given before. It feels almost like trust.',
          playerOptions: {
            'zh-cn': ['你……真的觉得我能做到？', '谢谢你相信我。', '这就是你叫我来的原因？'],
            'en': ['You... really think I can do this?', 'Thank you for believing in me.', 'Is that why you called me here?'],
            'ja': ['あなたは……本当に私にできると思ってるんですか？', '信じてくれてありがとう。', 'それがここに呼んだ理由ですか？'],
            'ko': ['당신은……진짜로 제가 할 수 있다고 생각해요?', '믿어줘서 감사해요.', '그게 저를 부른 이유예요?'],
          },
          relChanges: [12, 10, 8],
        },
        {
          npcContext: 'The meeting is ending. You came close to saying something personal and pulled back. End with something professional, but let one small thing slip — a question about how she is really doing, or a moment where you almost say something and then change it to something safer. Leave her wondering.',
          playerOptions: {
            'zh-cn': ['我挺好的。', '……你呢？', '谢谢你今天的咖啡。'],
            'en': ['I am fine.', '...And you?', 'Thank you for the coffee today.'],
            'ja': ['大丈夫です。', '……あなたは？', '今日のコーヒー、ありがとうございました。'],
            'ko': ['괜찮아요.', '……당신은요?', '오늘 커피 감사해요.'],
          },
          relChanges: [5, 15, 8],
        },
      ],
    },
  },

  // ══════════════════════════════════════════════════════
  // 签约场景（游戏开始前的街边相遇）
  // ══════════════════════════════════════════════════════
  signingScene: {
    rounds: [
      {
        // 街边 Round 1: 自我介绍
        getNPCLine(agentName, lang) {
          const lines = {
            'zh-cn': `他在你收好吉他时走了过来。\n\n"我叫<em style='color:var(--gold)'>${agentName}</em>，是经纪人。"\n\n他递给你一张名片。\n"我已经听你唱了三个晚上了。你有很特别的东西。"`,
            'en': `He walked over as you were packing up your guitar.\n\n"My name is <em style='color:var(--gold)'>${agentName}</em>. I'm a talent agent."\n\nHe held out a card.\n"I've been listening for three nights. You have something."`,
            'ja': `あなたがギターをしまっているとき、彼が近づいてきた。\n\n"<em style='color:var(--gold)'>${agentName}</em>です。マネージャーをしています。"\n\n彼は名刺を差し出した。\n"三晩、あなたの歌を聴いていました。特別なものを持っている。"`,
            'ko': `당신이 기타를 챙기는 사이 그가 다가왔다.\n\n"저는 <em style='color:var(--gold)'>${agentName}</em>입니다. 에이전트예요."\n\n그가 명함을 건넸다.\n"사흘 밤 동안 노래를 들었습니다. 특별한 게 있어요."`,
          };
          return lines[lang] || lines['en'];
        },
        options: {
          'zh-cn': ['你有什么打算？', '……我在听。', '谢谢。但我不确定。'],
          'en': ['What do you have in mind?', '...Go on.', 'Thank you. But I\'m not sure.'],
          'ja': ['どういうつもりですか？', '……続けて。', 'ありがとう。でも迷ってます。'],
          'ko': ['어떤 생각이에요?', '……계속 말씀하세요.', '감사해요. 하지만 모르겠어요.'],
        },
        relChanges: [8, 10, 3],
        isAuto: false,
      },
      {
        // 街边 Round 2: 提议见面
        getNPCLine(agentName, lang) {
          const lines = {
            'zh-cn': `"我不是随便找人的。"\n\n他目光直接地看着你。\n\n"如果你有兴趣，打给我。我们可以坐下来谈谈。"\n\n他转身要走，然后停顿了一下。\n"不急。但别等太久。"`,
            'en': `"I don't do this for just anyone."\n\nHe looked at you directly.\n\n"If you're interested, call me. We can sit down and talk."\n\nHe turned to leave, then paused.\n"No rush. But don't keep me waiting too long."`,
            'ja': `"私は誰でも声をかけるわけじゃない。"\n\n彼は真っ直ぐにあなたを見た。\n\n"興味があれば、電話して。話し合いましょう。"\n\n彼が背を向けかけ、少し間を置いた。\n"急がなくていい。でも、あまり待たせないで。"`,
            'ko': `"저는 아무한테나 찾아오지 않아요."\n\n그가 당신을 똑바로 바라봤다.\n\n"관심 있으면 전화 주세요. 이야기를 나눠봅시다."\n\n그가 돌아서다 잠시 멈췄다.\n"서두르지 않아도 돼요. 하지만 너무 오래 기다리게 하지는 마요."`,
          };
          return lines[lang] || lines['en'];
        },
        isAuto: true,
        autoText: {
          'zh-cn': '你在人群中看着他离开。\n\n名片在手里，还带着一点温度。\n\n三天后，你拨了那个号码。\n他的办公室在24楼。\n\n你坐在他对面，中间隔着一张玻璃桌。\n他把合同推到你面前——一年，独家代理。\n\n你签了。',
          'en': 'You watched him walk away through the crowd.\n\nThe card was still warm from his hand.\n\nThree days later, you called the number.\nHis office was on the 24th floor.\n\nYou sat across from him at a glass desk.\nHe slid a contract toward you — one year, exclusive representation.\n\nYou signed it.',
          'ja': 'あなたは人混みの中で彼が去るのを見ていた。\n\n名刺はまだ少し温かかった。\n\n三日後、あなたはその番号に電話した。\n彼のオフィスは24階にあった。\n\nガラスのデスクを挟んで向かい合った。\n彼は契約書をあなたの前に滑らせた——一年間、専属契約。\n\nあなたはサインした。',
          'ko': '당신은 인파 속에서 그가 떠나는 걸 바라봤다.\n\n명함이 아직 온기를 품고 있었다.\n\n사흘 후, 당신은 그 번호로 전화를 걸었다.\n그의 사무실은 24층에 있었다.\n\n유리 책상을 사이에 두고 마주 앉았다.\n그가 계약서를 밀어왔다——1년, 전속 계약.\n\n당신은 사인했다.',
        },
      },
    ],
  },

  // ══════════════════════════════════════════════════════
  // 闪回旁白（游戏开始前）
  // ══════════════════════════════════════════════════════
  flashback: {
    narration: {
      'zh-cn': '每天晚上，我都在热闹的街道摆好位置。\n吉他盒打开在地上。\n靠唱歌收小费——为了房租，为了食物，为了梦想。\n\n路过的人会放慢脚步，有时有人会停一会儿。\n但没有人，真正地留下来。',
      'en': 'Every night, I set up on the same busy street corner.\nGuitar case open on the pavement.\nSinging for tips — for rent, for groceries, for the dream.\n\nPeople would slow down. Some would stop for a moment.\nBut no one ever really stayed.',
      'ja': '毎晩、にぎやかな街角に陣取った。\nギターケースを地面に開けて。\nチップのために歌う——家賃のため、食費のため、夢のため。\n\n人々は足を緩め、時々立ち止まる人もいた。\nでも、本当に留まった人は、いなかった。',
      'ko': '매일 밤, 활기찬 거리에 자리를 잡았다.\n기타 케이스를 바닥에 열어두고.\n팁을 위해 노래했다——집세, 식비, 꿈을 위해.\n\n사람들은 발걸음을 늦추고, 가끔 잠깐 멈추기도 했다.\n하지만 아무도, 진짜로 머물지는 않았다.',
    },
  },

  // ══════════════════════════════════════════════════════
  // 工具函数
  // ══════════════════════════════════════════════════════
  utils: {
    getChapter(day) {
      return Math.ceil(day / 30);
    },
    getChapterTitle(chapter, lang) {
      const ch = STORY.chapters[Math.min(chapter, 12)];
      if (!ch) return '';
      return ch.title[lang] || ch.title['en'] || '';
    },
    getScriptedEvent(day) {
      return STORY.scriptedEvents[day] || null;
    },
    getCharacterEmotionalState(characterKey, day) {
      const char = STORY.characters[characterKey];
      if (!char || !char.emotionalArc) return '';
      const chapter = Math.ceil(day / 30);
      // Find closest chapter
      for (let c = chapter; c >= 1; c--) {
        if (char.emotionalArc[c]) return char.emotionalArc[c];
      }
      return '';
    },
  },

};

// 确保可以在浏览器中使用
if (typeof module !== 'undefined') module.exports = STORY;
