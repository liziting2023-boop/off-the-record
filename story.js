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
    startDate: { year: null, month: 3, day: 1, weekday: 1 }, // 3月1日 周一
    totalDays: 360,
    totalChapters: 12,
    daysPerChapter: 30,
  },

  // ══════════════════════════════════════════════════════
  // 生日 & 特殊节日
  // ══════════════════════════════════════════════════════
  specialDates: {
    // NPC生日 { month, day }
    birthdays: {
      agent:    { month: 11, day: 15, label: { 'zh-cn':'经纪人的生日', en:"Agent's Birthday" } },
      drummer:  { month: 6,  day: 21, label: { 'zh-cn':'鼓手的生日',   en:"Drummer's Birthday" } },
      actor:    { month: 2,  day: 14, label: { 'zh-cn':'男演员的生日', en:"Actor's Birthday" } },
      detective:{ month: 9,  day: 3,  label: { 'zh-cn':'侦探的生日',   en:"Detective's Birthday" } },
      butler:   { month: 3,  day: 21, label: { 'zh-cn':'管家的生日',   en:"Butler's Birthday" } },
      player:   { month: 8,  day: 10, label: { 'zh-cn':'你的生日',     en:'Your Birthday' } },
    },

    // 西方节日（月/日）
    holidays: {
      valentine:    { month: 2,  day: 14, label: { 'zh-cn':"情人节",       en:"Valentine's Day" } },
      halloween:    { month: 10, day: 31, label: { 'zh-cn':"万圣节",       en:"Halloween" } },
      thanksgiving: { month: 11, day: 28, label: { 'zh-cn':"感恩节",       en:"Thanksgiving" } },
      christmas_eve:{ month: 12, day: 24, label: { 'zh-cn':"圣诞前夜",     en:"Christmas Eve" } },
      christmas:    { month: 12, day: 25, label: { 'zh-cn':"圣诞节",       en:"Christmas Day" } },
      newyear_eve:  { month: 12, day: 31, label: { 'zh-cn':"新年前夜",     en:"New Year's Eve" } },
      newyear:      { month: 1,  day: 1,  label: { 'zh-cn':"新年",         en:"New Year's Day" } },
    },

    // 根据游戏天数获取当前日期（从3月15日开始）
    getGameDate(day) {
      const start = new Date(2027, 2, 1); // March 1, 2027 = Monday（与 index.html 的起始日期保持一致）
      const current = new Date(start);
      current.setDate(start.getDate() + day - 1);
      return { month: current.getMonth() + 1, day: current.getDate() };
    },

    // 检查今天是否是NPC生日
    getNPCBirthday(gameDay) {
      const { month, day } = this.getGameDate(gameDay);
      for (const [npc, bd] of Object.entries(this.birthdays)) {
        if (bd.month === month && bd.day === day) return { npc, ...bd };
      }
      return null;
    },

    // 检查今天是否是节日
    getHoliday(gameDay) {
      const { month, day } = this.getGameDate(gameDay);
      for (const [key, hd] of Object.entries(this.holidays)) {
        if (hd.month === month && hd.day === day) return { key, ...hd };
      }
      return null;
    },

    // 根据好感度决定NPC行为
    getAffinityTier(relationship) {
      if (relationship >= 81) return 'high';    // 主动出现 + 特殊邀约
      if (relationship >= 61) return 'mid';     // 频繁消息 + 偶尔邀约
      if (relationship >= 31) return 'low';     // 偶尔消息
      return 'none';                             // 基本不联系
    },

    // 生成NPC主动消息的场景描述
    getProactiveContext(npcKey, tier, occasion, lang, playerName, npcName) {
      const isZh = lang === 'zh-cn' || lang === 'zh-tw';
      const isHoliday = occasion && occasion.key;
      const isBirthday = occasion && occasion.npc;
      const isPlayerBday = occasion && occasion.npc === 'player';

      if (isPlayerBday) {
        return {
          'zh-cn': npcName + '记得你的生日。发一条消息或是邀约。',
          en: npcName + ' remembered your birthday. Send a message or invitation based on your relationship tier: ' + tier,
        }[lang] || npcName + ' remembered your birthday.';
      }

      if (isBirthday) {
        return {
          'zh-cn': '今天是' + npcName + '的生日。他可能提到，也可能假装没事。',
          en: "It is " + npcName + "'s birthday today. He may mention it or pretend nothing.",
        }[lang] || "It is " + npcName + "'s birthday.";
      }

      const tierContexts = {
        high: {
          'zh-cn': tier === 'high' ? '好感度很高。他主动联系，语气比平时亲密，可能提出今晚见面或特殊邀约。' : '',
          en: 'High affinity. He reaches out proactively, warmer than usual, may suggest meeting up.',
        },
        mid: {
          'zh-cn': '好感度中等偏高。他发来消息，语气轻松，可能是随手一条也可能别有用意。',
          en: 'Medium-high affinity. He sends a casual message, relaxed tone, may have ulterior motives.',
        },
        low: {
          'zh-cn': '好感度一般。他偶尔联系，保持适当距离。',
          en: 'Low-medium affinity. Occasional contact, maintaining appropriate distance.',
        },
      };

      if (isHoliday) {
        const holidayName = occasion.label[lang] || occasion.label.en;
        return (isZh ? '今天是' + holidayName + '。' : 'Today is ' + holidayName + '. ') +
          (tierContexts[tier] ? (isZh ? tierContexts[tier]['zh-cn'] : tierContexts[tier].en) : '');
      }

      return isZh ?
        (tierContexts[tier] ? tierContexts[tier]['zh-cn'] : '') :
        (tierContexts[tier] ? tierContexts[tier].en : '');
    },
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
      composition: 'intimate café, sitting alone at a small table with a coffee cup, soft warm lighting, solo portrait, NO other people in frame, NO other customers visible',
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
    farmers_market: {
      isOutdoor: true,
      isPublic: true,
      composition: 'lively farmers market, fresh vegetables and fruit stalls, morning light, baskets and produce crates',
    },
    supermarket: {
      isOutdoor: false,
      isPublic: true,
      composition: 'bright modern supermarket aisle, shelves of groceries, shopping cart, clean fluorescent lighting',
    },
    beauty_salon: {
      isOutdoor: false,
      isPublic: true,
      composition: 'elegant beauty salon, facial treatment chairs, soft spa lighting, plants and mirrors',
    },
    hair_salon: {
      isOutdoor: false,
      isPublic: true,
      composition: 'stylish hair salon, styling chairs and large mirrors, hair products on shelves, warm modern lighting',
    },
    shopping_mall: {
      isOutdoor: false,
      isPublic: true,
      composition: 'upscale shopping mall interior, boutique storefronts, glass railings and escalators, bright airy atrium',
    },
    dance_studio: {
      isOutdoor: false,
      isPublic: true,
      composition: 'bright dance studio, full-wall mirrors and ballet barre, polished wooden floor, large windows with daylight',
    },
    gym: {
      isOutdoor: false,
      isPublic: true,
      composition: 'modern fitness gym, weight machines and treadmills, large windows, energetic clean space',
    },
    park: {
      isOutdoor: true,
      isPublic: true,
      composition: 'peaceful city park, tree-lined walking path, benches and a small pond, dappled sunlight through leaves',
    },
    furniture_store: {
      isOutdoor: false,
      isPublic: true,
      composition: 'cozy furniture showroom, staged living room displays with sofas lamps and rugs, warm inviting retail lighting',
    },
    mountain_viewpoint: {
      isOutdoor: true,
      isPublic: false,
      composition: 'hilltop viewpoint at night overlooking the glittering city lights below, low stone wall, vast starry night sky, intimate quiet atmosphere',
    },
    beach: {
      isOutdoor: true,
      isPublic: true,
      composition: 'quiet beach in the evening, gentle waves, soft sand, distant pier lights, afterglow fading into night sky',
    },
    cinema: {
      isOutdoor: false,
      isPublic: true,
      composition: 'cozy movie theater, rows of plush seats, soft screen glow in the dark, popcorn and drinks in cup holders',
    },
    concert_hall: {
      isOutdoor: false,
      isPublic: true,
      composition: 'elegant concert hall interior, warm stage lights on an orchestra, ornate balconies, hushed grandeur',
    },
    opera_house: {
      isOutdoor: false,
      isPublic: true,
      composition: 'opulent opera house, red velvet seats, gilded balconies, grand chandelier, dramatic stage lighting',
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
      culture: 'Western. Behaves like a high-powered Western entertainment industry professional. Direct but personable — he knows how to put people at ease while staying in charge.',
      corePersonality: [
        'Warm, approachable professional — demanding about the work, but kind to the person',
        'Precise, ambitious, always three steps ahead',
        'Shows genuine care openly in small gestures — remembers details, checks in on her',
        'The kind of man who notices everything and lets you know he noticed',
        'Protects and supports — mentorship with warmth, not control',
        'Western directness softened with humor: says what he means, with a smile',
        'His texts are brief but warm — a few words that land gently',
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
      // UNIVERSAL RULE for all NPCs:
      // Never say the real name of any other NPC in dialogue.
      // Refer to others only by role: "band leader", "the actor", "building manager", "the detective"
      emotionalArc: {
        1: 'In charge but welcoming. High standards for the work, genuine encouragement for her — he wants her to succeed and lets it show.',
        2: 'Warm mentor energy. Actively protects her from industry predators and checks in on how she is holding up.',
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
      culture: 'Western rock music culture. Behaves like a musician who came up through gigs, not conservatories. Casual, physical, anti-authoritarian. Does not bow or defer. Swears occasionally. Comfortable with silence and sarcasm.',
      corePersonality: [
        'Direct and blunt — says exactly what he thinks',
        'Rough around the edges but deeply loyal',
        'Terrible at expressing feelings with words',
        'Expresses care through actions: adjusting tempos, standing between her and danger',
        'Music is his first language — he speaks it better than anything else',
        'Western rock ethos: authenticity over polish, passion over manners',
        'Would rather walk out than pretend to agree',
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
      culture: 'Western celebrity culture. Confident in a way that reads as arrogant in other cultures but is normal in Hollywood. Physically flirtatious, makes eye contact, invades personal space. His charm is practiced but not fake — he genuinely enjoys people.',
      corePersonality: [
        'Devastatingly charming — knows exactly how he looks and uses it',
        'Simultaneously dating multiple women, lies effortlessly',
        'Beneath the performance: a wounded person from a broken family',
        'Shows vulnerability selectively — it is also a seduction technique',
        'Capable of genuine love but terrified of it',
        'Western celebrity confidence: comfortable being looked at, touched, talked about',
        'Flirts with eye contact and physical proximity, not words alone',
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
      culture: 'Western noir. Think modern private investigator — drinks black coffee, wears good coats, keeps his personal life completely separate from work. Not mysterious for drama, just private by nature. Dry humor, very occasional.',
      corePersonality: [
        'Says very little but misses nothing',
        'Deliberately unreadable — a professional habit that became his personality',
        'His questions always have a purpose three layers deep',
        'Protecting people is the only way he knows how to care',
        'Has seen too much — cynical but not cruel',
        'Western investigator ethos: information is power, silence is strategy',
        'Asks questions like he already knows the answers',
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
      culture: 'Western — young, earnest, slightly awkward in the way of someone who grew up with money but is trying not to show it. Calls her "sis" casually (NOT a cultural honorific — just warm informality). Brings food not as service but as genuine gesture. Would feel embarrassed to be thanked too much.',
      corePersonality: [
        'Earnest and caring — means everything he says',
        'Slightly shy, easily flustered, ears go red',
        'Calls her "sis" casually — warm informality, not a formal honorific',
        'Remembers every small detail about her preferences',
        'His devotion is genuine AND complicated',
        'Western informality: comfortable sitting on the floor, sharing food, casual kindness',
        'Does not bow or use formal language — just warm and direct',
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
        'zh-cn': '经纪人的办公室在24楼。\n落地窗外，这座城市向远处延伸——等待着记住你的名字。\n\n你一推门，他就从桌后站了起来，\n笑着朝你走来："来了？正等你呢。"',
        'en': 'Your agent\'s office is on the 24th floor.\nThrough the floor-to-ceiling windows, the city stretches out below — still waiting to learn your name.\n\nThe moment you push the door open, he rises from behind his desk,\nwalking toward you with a smile: "There you are. I\'ve been waiting."',
        'ja': 'エージェントのオフィスは24階にある。\n床から天井までの窓の外、街が広がっている——まだあなたの名前を知らない街が。\n\nドアを開けた瞬間、彼は机の後ろから立ち上がり、\n笑顔で歩み寄ってきた。「来たね。待ってたよ」',
        'ko': '에이전트의 사무실은 24층에 있다.\n바닥부터 천장까지 이어진 창문 너머, 도시가 펼쳐져 있다——아직 당신의 이름을 모르는 도시가.\n\n문을 열자마자 그는 책상 뒤에서 일어나\n미소를 지으며 다가왔다. "왔구나. 기다리고 있었어."',
      },
      dialogRounds: [
        {
          // Round 1: 冷酷评估
          npcContext: 'This is the first official work meeting after signing. You are welcoming her into her new life — warm, encouraging, but clearly the one in charge. Start by putting her at ease: a genuine observation about her potential or something specific you noticed about her music that impressed you. High standards, warm delivery.',
          playerOptions: {
            'zh-cn': ['我准备好了。', '……好。', '你想从哪里开始？'],
            'en': ['I am ready.', '...Okay.', 'Where do you want to start?'],
            'ja': ['準備できています。', '……はい。', 'どこから始めますか？'],
            'ko': ['준비됐어요.', '……네.', '어디서부터 시작할까요?'],
          },
          relChanges: [5, 3, 8],
        },
        {
          // Round 2: 公布首月工作计划 + 乐队 + 明天见鼓手（严禁说鼓手的名字，玩家还没见过他）
          npcContext: 'Give her the work directive. First: you have already planned her ENTIRE first month — 3 to 4 working days per week (vocal training, dance and fitness, demo recording, styling shoots, media training, producer meetings). The full schedule is already in her calendar — tell her to check it tonight. Warn her that extra work may be added on short notice and she is expected to show up. Second: you have assembled a band — she is the lead singer. The band leader is a drummer. CRITICAL: Do NOT mention the drummer by name under any circumstances. He is unnamed in this scene. Describe him only as: difficult, high standards, best in the city. Tell her to go to the recording studio tomorrow at 9am sharp to meet him — encourage her: you picked this band FOR her, you believe she can win him over. Firm about the schedule, warm about her.',
          playerOptions: {
            'zh-cn': ['我明天一定去。', '他好相处吗？', '你为什么要为我组乐队？'],
            'en': ['I will be there tomorrow.', 'Is he easy to work with?', 'Why did you put a band together for me?'],
            'ja': ['明日必ず行きます。', '彼と上手くやれますか？', 'なぜ私のためにバンドを？'],
            'ko': ['내일 꼭 갈게요.', '같이 일하기 쉬운가요?', '왜 저를 위해 밴드를 만들었어요?'],
          },
          relChanges: [5, 8, 10],
        },
        {
          // Round 3: 热情送客
          npcContext: 'The meeting is ending. Wrap up warmly: stand up, walk her to the door yourself, remind her gently "Nine o\'clock tomorrow", and send her off with genuine encouragement — you believe in her and you let her feel it. Maybe a small personal touch: use her name warmly, or tell her to get a good dinner tonight. NO cold dismissals, NO looking away, NO acting like nothing happened — you see her out like a gracious host.',
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
          npcContext: 'She is leaving. You have turned back to your drums — classic dismissal. But just as she reaches the door, say one more thing. Not a compliment. A challenge. Something like "that high note — do it again tomorrow" or "show up early." It sounds like an order but it means: I\'m paying attention. Do NOT soften it. Do NOT explain it. Just say it to her back, like it costs you nothing. But it does.',
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
          npcContext: 'You are charming and effortlessly self-assured. You have heard her music — be specific about one thing in it that actually caught you off guard. Not generic praise. Something that reveals you actually listened. Then immediately pivot back to your usual playful surface, like you gave away too much and need to take it back. The hook: for one second, the performance dropped.',
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
          npcContext: 'Before leaving, make one move that is harder to dismiss than the rest of the conversation. Could be slipping her your actual personal number (not your publicist), naming a specific place and time, or saying something that drops the performance just for a second. Western style — direct, confident, no gifts. You do not need props. Make it feel like a choice she has to make.',
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
          npcContext: 'Introduce yourself — you are the building manager for this floor. Slightly nervous, slightly over-prepared. You baked her something (lemon cake) because you noticed she has been skipping meals. Western informality: no honorifics, no formal titles. Maybe call her by her first name or just "hey." The cake is the gesture. Let it be awkward in a genuine way, not in a performative way.',
          playerOptions: {
            'zh-cn': ['你……做的？', '谢谢你，这很贴心。', '你是怎么知道我喜欢甜的？'],
            'en': ['You... made this?', 'Thank you, that is very thoughtful.', 'How did you know I like sweet things?'],
            'ja': ['あなたが……作ったの？', 'ありがとう、気が利くね。', '甘いものが好きってどうして知ってたの？'],
            'ko': ['네가……만든 거예요?', '감사해요, 정말 세심하네요.', '제가 단 거 좋아하는 걸 어떻게 알았어요?'],
          },
          relChanges: [10, 8, 12],
        },
        {
          npcContext: 'Tell her something small you have noticed — the time she usually gets home, what coffee she orders, that she always takes the stairs. Be a little embarrassed about how much you have noticed. Western earnestness: this is not poetic, it is just honest. Do not frame it as admiring her stoicism — just say what you saw.',
          playerOptions: {
            'zh-cn': ['你……观察得很仔细。', '你平时也这么关心其他住户吗？', '谢谢你注意到了。'],
            'en': ['You... notice a lot.', 'Do you do this for all the residents?', 'Thank you for noticing.'],
            'ja': ['よく……見てるんだね。', '他の住人にもこうするの？', '気にかけてくれてありがとう。'],
            'ko': ['잘……관찰하네요.', '다른 주민들한테도 이렇게 해요?', '신경 써줘서 감사해요.'],
          },
          relChanges: [8, 5, 15],
        },
        {
          npcContext: 'You have offered to help. Now as she is about to leave, say one thing that reveals you have been thinking about her more than a building manager should. Not creepy — genuine. Maybe you remembered something specific she mentioned once in passing, or you stayed up to fix something in her apartment before she even asked. Then immediately get flustered and cover it with something practical. The hook: he noticed. He always notices.',
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
          'zh-cn': '你看着他消失在人群里。\n\n名片还带着体温。\n\n三天后，你拨了那个号码。\n他的办公室在24楼——落地窗，城市全景，一个告诉你他很认真的地方。\n\n他没抬头，把合同推过玻璃桌面。\n一年。独家代理。\n\n你拿起了笔。',
          'en': 'You watched him disappear into the crowd.\n\nThe card was still warm.\n\nThree days later, you called.\nHis office was on the 24th floor — corner suite, city view, the kind of room that tells you he is serious.\n\nHe slid a contract across the glass desk without looking up.\nOne year. Exclusive representation.\n\nYou picked up the pen.',
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
