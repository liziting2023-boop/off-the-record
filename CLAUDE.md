# Off the Record · Claude Code 开发手册

> 每次开新 Claude Code 会话时自动加载。包含项目全貌、当前状态和开发约定。

---

## 1. 项目基本信息

| 项目 | 说明 |
|------|------|
| 游戏名 | Off the Record |
| 类型 | AI 驱动乙女游戏（视觉小说） |
| 目标用户 | 非中国市场女性，30-50 岁，欧美/东南亚 |
| 当前版本 | **v10.81** |
| Live 网址 | https://liziting2023-boop.github.io/off-the-record/ |
| GitHub 仓库 | liziting2023-boop/off-the-record |
| 本地仓库路径 | D:\OTR\repo |
| 设计文档路径 | D:\OTR\ |

> ⚠️ **每次新会话先检查 `git log --oneline origin/main..HEAD`**：本地经常会积累好几个未推送的 commit（上次记录时是 v10.46～v10.50 共5个未 push），不要假设本地=线上。开发完先问用户要不要上传。

---

## 2. 开发环境与工作流

### Claude Code 工作流（替代原网页版 Python 脚本）
```
# 每次开始前确认本地是最新代码
cd D:\OTR\repo
git pull

# 改完后
git add <文件>
git commit -m "vX.XX 说明"
git push https://<TOKEN>@github.com/liziting2023-boop/off-the-record.git main
```

**GitHub Token**：存于交接文档 `D:\OTR\OTR_开发交接文档_v10.39.docx`，有效期 ~2027年6月。

### 自动部署
push 到 main → GitHub Actions → 约 30 秒生效。

### Worker v2（2026-07-03 API部署，上架准备第一阶段）
- **限额**：每设备每日 claude 400次 / image 150张；全局日上限 5000 / 2000（防抓包刷账单）。超限返回 429 `{error:'quota_exceeded'}`，游戏端 `warnQuota()` 一次性提示并优雅降级
- **设备标识**：请求头 `X-Device-Id`（游戏端 `getDeviceId()` 生成UUID存 `otr_device_id`，独立于存档key）；无头则按IP兜底限额
- **云存档**：`/save` GET/PUT 按设备ID存取（上限400KB）。游戏端：saveGame 包装后8秒防抖推送；启动时本地无进度→询问恢复云端档→写localStorage后reload（走loadGame原地合并，避免v10.51那类引用分裂）
- **KV**：`OTR_KV`（id `b8fb10bd006c4a7991933606514f19f6`），键：`q:{日期}:{设备}:{类型}`/`g:{日期}:{类型}`（TTL 2天）/`save:{设备}`
- ⚠️ 用API重部署Worker时，metadata.bindings 必须带全：2个 plain_text key + OTR_KV 绑定，否则会丢
- 上架第二阶段待做：可选登录（Sign in with Apple/Google）、内购（RevenueCat，**已定"订阅为主+图/装扮氪金层"**，完整方案见 `D:\OTR\monetization_plan.md`——订阅卖"关系持续/记忆/能约"、氪金卖专属CG/换装/搬家、群聊+每月新NPC探索、记忆分层架构、快进机制前置；定价总额倒推目标全年$15-40）、隐私政策页

### 每次 commit 必须同步更新版本号（三处）
- `index.html` 约第 349 行：`<p ...>v10.XX</p>`
- `index.html` 约第 2709 行：`v.innerHTML = 'v10.XX · ...'`
- `index.html` 第 8-9 行：`<script src="story.js?v=10.XX">` / `<script src="state.js?v=10.XX">` —— **必须更新**，否则用户浏览器可能继续用缓存的旧版 story.js/state.js，导致明明已经修复的 bug 在用户端"复现"（v10.43 才加上这个版本号参数，之前一直没有缓存保护）

---

## 3. 文件架构

| 文件 | 职责 |
|------|------|
| `index.html` | 游戏引擎：UI、导航、API调用、渲染、所有 JS 逻辑 |
| `story.js` | 故事内容：角色设定、章节、剧本事件、签约场景 |
| `state.js` | 游戏状态：NPC记忆、图片提示词、好感度、存档系统 |
| `CLAUDE.md` | 本文件，Claude Code 自动加载 |

### 设计文档（D:\OTR\）
| 文件 | 内容 |
|------|------|
| `npc_appearance.md` | NPC 外形设定表（身高、体型、穿搭等，可持续填写） |
| `npc_backgrounds.md` | NPC 人物背景、感情线、父母背景（可持续填写） |
| `npc_storylines.md` | NPC 平行感情线（好感未达标时 NPC 的独立发展） |
| `npc_secondary.md` | 二线 NPC 设定与开发时机 |
| `monetization_plan.md` | 收费方案（订阅+氪金层）：三层收入结构/记忆与成本/群聊+月更NPC/搬家/快进机制/竞品对标，随App上架实施 |

---

## 4. 技术关键点

### API
- Claude 对话：`claude-sonnet-4-6`（**不换模型**）
- 图片生成：默认 `fal-ai/flux/schnell`；设置页"人物图质量"开关：开=人物立绘走 `fal-ai/flux/dev`(28步)、背景仍 schnell。**Worker 已于 2026-07-02 通过 API 部署支持 `model` 字段白名单**（schnell/dev，未知值回落 schnell），三路径已实测（schnell默认/dev/claude绑定变量均正常）。注意：Worker 的两个 API key 是**明文变量绑定**（非加密secret），用 API 重新部署时必须在 metadata.bindings 里原样带上，否则会丢失
- 代理：Cloudflare Worker `off-the-record-api.liziting2023.workers.dev`
  - `/claude` → Anthropic API
  - `/image` → fal.ai

### DEV MODE
- `DEV_MODE_IMG = false`（true = 跳过生图省钱，const，改源码切换）
- `DEV_MODE_TXT = false`

### 开发者后台命令（浏览器控制台 F12 调用，v10.72 加）
- **`otrNewQuota()`**：换一个新设备ID → 立刻拿到全新的每日AI额度（服务器按设备ID计额度，每设备每日约400次对话）。不改Worker、本地存档进度不丢（存档key独立于设备ID）。**开发者测试撞额度时随时自己调**
- **`otrQuota()`**：查看当前设备ID（额度按它在Worker端计）
- 撞额度/网络失败时游戏不再空白卡住：`claude()` 优雅返回空串（不再throw冻结场景），场景/快速对话/手机聊天都会显示 `aiFailMsg()`「AI内容暂时无法生成，可能今日额度已满」+ 出口按钮（模拟真实玩家看到的降级）

### 存档
- Key：`otr_save_v2`（v1 已废弃）
- 存在浏览器 localStorage

### 安全
- 所有 API Key 只存 Cloudflare Worker 环境变量，**不放代码里**
- 曾发生 API Key 泄露事故，现已修复

---

## 5. 游戏设定

### 女主
- 23 岁创作型歌手，城市里住了约 2 个月，之前街头卖唱
- 游戏第 1 天 = 签约后第 1 天

### 基本参数
- 开始日期：3 月 1 日（周一）春季
- 总时长：360 天，12 章，每章 30 天
- 可选城市：纽约、洛杉矶、伦敦、巴黎、芝加哥、多伦多、悉尼、纳什维尔（v10.73 取消东京/首尔，改欧美音乐城市迎合西方市场）
- 游戏语言：EN / JA / KO / DE / FR / ES / PT / TR / ZH-CN / ZH-TW

---

## 6. 主线 NPC 设定摘要

| NPC | 年龄 | 出场 | 身高 | 感情现状（游戏开始） |
|-----|------|------|------|-------------------|
| 经纪人 | 32 | Day 1 | 178cm | 单身，两年前解除婚约 |
| 鼓手 | 26 | Day 2 | 180cm | 有同居女友（名存实亡） |
| 男演员 | 29 | Day 3 | 180cm | 有公关CP（假的），实际单身 |
| 管家 | 20 | Day 4 | 172cm | 单身，从未有真实感情 |
| 侦探 | 36 | Day 40 | 高挑 | 丧偶，儿子4岁由妹妹抚养 |

### 隐藏剧情
- 管家是经纪人**同父异母**弟弟（无继承权，私生子背景）
- 管家城府深、表面乖巧，雇侦探调查经纪人找把柄图要挟
- 得知经纪人签了女主后，主动安插自己为女主楼管
- 侦探受管家雇佣，但逐渐对委托产生怀疑，形成独立判断
- 秘密在第 210 天（第 7 章）揭露

### NPC 好感度加分方向
| NPC | 加分行为 |
|-----|---------|
| 经纪人 | 有主见、不卑不亢、自信 |
| 鼓手 | 强势直接、挑战他 |
| 男演员 | 冷淡若即若离 |
| 管家 | 温柔关心、接受好意 |
| 侦探 | 冷静理性、有分寸 |

---

## 7. 图片生成提示词结构

每个 NPC 的生图函数在 `state.js` 的 `imagePrompts` 对象里：
- `buildAgentPrompt(G, scene, day)`
- `buildDrummerPrompt(G, scene, day)`
- `buildActorPrompt(G, scene, day, wearingDisguiseGlasses)`
- `buildDetectivePrompt(G, scene, day, isBackground)`
- `buildButlerPrompt(G, scene, day, secretRevealed)`
- `buildProtagonistPrompt(G, scene, additionalContext)`

**v10.40 重要更新**：每个族裔加入了 `features` 字段（明确五官描述），防止生图族裔错误。

**v10.42 重要更新**：
- 各 `build*Prompt` 函数不再自己拼接风格（`style`）后缀，统一由 `index.html` 的 `img()` 函数在提示词**最前面**加风格描述（权重更高），避免重复且加强一致性。
- 同一批候选图（女主三选一 `genProto()`、经纪人三选一）会共用一个随机 `seed` 传给 `img()`，保证三张图风格/发色一致，只有姿势角度不同。
- 男性 NPC 族裔候选池在 `index.html` 顶部 `AGENT_ORIGIN_VALS`（14个），每次打开选择界面用 `pickRandomOrigins()` 随机抽 8 个展示。

---

## 8. 已完成功能（截至 v10.50）

- 3 文件架构
- 亮粉色视觉主题
- 自由文字输入 + 快捷选项
- 好感度系统 + 音效反馈
- 日历系统（工作安排、NPC 邀约、冲突检测）
- 生日/节日触发消息
- 好感度触发 NPC 主动联系
- 回忆相册（右上角入口，**仅存玩家确认的图**）
- 手机系统（消息/动态/行业资讯）
- 族裔文化特征影响对话风格
- 签约场景 → 第 1 章 → Day 1-5 固定剧情
**v10.40～v10.48 历史修复摘要**（详细原因见 git log / 旧版本备份，这里只留结论）：
- 族裔生图准确性、相册误存图、对话框遮挡NPC、NPC外形（v10.40）
- Day1卡死（`G.calendar`未初始化）、日期显示不一致（v10.41）
- 女主新增北美族裔、男性NPC族裔池8→14随机抽取、发色新增紫色、三选一候选图风格/发色不一致、默认美术风格改Illustrated（v10.42）
- **script标签加`?v=10.XX`防浏览器缓存旧代码**（v10.43，重要且容易再犯——不加这个，用户端会一直复现"已修复"的bug）、签约场景遮罩内联样式绕过CSS修复、客厅三选一改真正不同布局（v10.43）
- vn-dialog限高防挡脸、每日选项固定3槽位、日历补齐CSS样式、消息已读红点修复、夜景复用白天布局、NPC头像存入回忆、"相册"改"回忆"、手机模块系统性白字配色bug、消息加日期显示（v10.44）
- 管家不背包、咖啡厅场景不画多余路人、日历"今天"标识加边框圈（v10.45）
- 女主/男性NPC形象一致性：用固定seed复用减少生图漂移，非真正人脸锁定（v10.46/v10.47）
- 晚间消息卡片已读修复、消息内容与时间戳逻辑矛盾修复（v10.48）

**v10.49～v10.50（近期，细节保留）**：
- **[v10.49] 严重bug**：`playFree()` 全代码库未定义，Day6之后所有自由日选项点击直接报错卡死。已补全实现
- **[v10.49]** 修复首页/日历星期计算不一致：`startDay()` 之前用硬编码公式"Day1=周一"算星期，日历用真实 `Date` 对象算星期，两者对不上（如日历里3月3日是周日，首页却显示周三）。统一改用真实 `Date` 对象计算（新增 `getGameWeekday()`/`isGameWeekend()`），顺带让游戏内星期和现实2024年3月的日历完全对齐
- **[v10.49]** 工作日/周末自由日选项差异化：`buildDayOpts()` 非剧情天现在周末（周六/周日）只显示3个休闲/社交选项，不出现工作选项；周一至周五保持"1工作+2社交"
- **[v10.49]** 每日/晚间界面改为客厅照片全屏背景：`.daily-room`/`.eve-room` 改为 `position:absolute` 铺满整个屏幕，叠加渐变遮罩保证文字可读，选项/消息卡片改为固定高度紧凑排列（不再用 `flex:1` 撑满剩余空间）
- **[v10.49]** 鼓手（以及男演员、管家）登场统一改为"先展示过渡独白介绍这个NPC，再问族裔"，不再像之前那样一上来就弹出"你觉得他是哪里人"的选择框。原本这个处理只对男演员做了（`startScriptedSceneWithLateOrigin`），现在对所有 `needsOriginBefore` 的NPC统一生效
- **[v10.49]** 晚间AI消息内容会引用当天实际发生的剧情（新增 `G.today = {label, isWork, npc}`，在 `startScriptedScene`/`playFree`/`playScheduledEvent` 里统一记录），避免出现"当天明明去了录音室，晚上却收到消息说试镜表现很好"这种前后矛盾
- **[v10.49]** 手机未读徽章健壮性修复：之前有3处独立用 `G.phone.unreadCount += 1` 这种手动累加的方式维护未读数，和 `updatePhoneBadge()` 按"未读会话数"重新计算的方式是两套不同逻辑，容易产生偏差导致徽章清不干净。统一改为都调用 `updatePhoneBadge()` 重新计算真实状态；晚间"收到新消息"卡片也改为确认真的有新消息才显示
- **[v10.49] 新功能**：NPC消息可以提前安排未来1-5天的工作活动（如"3天后彩排"），AI用结构化JSON返回 `{text, event:{daysFromNow, title}}`，自动写入日历（`source:'npc_message'`），到了那天会在当日选项里优先显示为"今日剧情"（新增 `playScheduledEvent()`），点击后带出对应NPC的场景
- **[v10.50] 严重bug修复**：`nextDay()` 里有硬编码 `if (G.day > 5) { alert(...); return; }`——玩家玩到第5天结束睡觉进入第6天时会弹窗"更多内容即将到来"然后彻底卡死，不会调用 `startDay()`。这是早期只写到 Day5 时的占位逻辑，现在自由日系统已经补全能用，这个硬停止变成了挡住所有玩家的阻断性 bug，已移除
- **[v10.50] `/code-review` 发现并修复的4个正确性问题**（NPC日程安排功能，v10.49引入）：1）安排的活动如果落在剧情固定日会被永久卡住未处理，现在生成时会检查 `STORY.utils.getScriptedEvent()` 跳过剧情日；2）同一天两个NPC都安排活动时后一个会被静默丢弃，现在生成时检查当天是否已有安排；3）活动场景背景图之前写死"音乐训练室"，现在AI会在结构化JSON里一起给出合适的地点（`locationKey`）；4）安排的活动如果和当天待处理的邀约（pending invite）撞车会把邀约挤出每日选项，现在改为优先显示待处理邀约
- **[v10.50]** 修复客厅/晚间全屏背景改造（v10.49）引入的点击穿透问题：`.daily-bg-overlay`/`.eve-bg-overlay`/`.daily-wrap`/`.eve-content` 没设置 `pointer-events`，导致点击房间照片放大看图的功能被挡住。补上 `pointer-events:none`（遮罩层）+ `pointer-events:auto`（内容层直接子元素）
- **[v10.50]** 修复 `portraitSeed` 一致性功能里的 falsy-zero bug：用 `!seed` 和 `seed||null` 判断"是否已设置"，当随机生成的种子恰好是 `0`（约百万分之一概率）时会被误判为未设置，导致这次形象一致性保护失效。改用 `== null` 精确判断

---

**v10.51（本轮，用户实测反馈修复 + 新功能）**：
- **[v10.51] 重大bug**：`STATE.save.loadGame()` 用 `STATE.data = _deepMerge(...)` 替换了对象引用，而 `const G = STATE.data` 在脚本解析时已捕获旧引用 → 存档处于"精神分裂"状态：游戏主逻辑（G：天数/玩家/手机）每次刷新都是新档、进度从未真正保存；好感度/记忆（走 `STATE.data` 的 `STATE.relationships.*`）却载入旧档持续累积。这就是"游戏第一天好感度页却显示旧NPC 100/100"的根源。修复：loadGame 改为原地合并（先delete全部键再Object.assign），保持 `G === STATE.data`
- **[v10.51]** 标题页新增"继续游戏 · 第N天"/"新的开始"双按钮；新增 `STATE.reset()`（原地重置+清存档），开新游戏不再把旧好感度/名字/记忆带进新档
- **[v10.51]** 起始日期改为 **2027年3月1日=周一**（原用2024年，3月1日是周五，导致Day2周六被排录音室工作，违反设定"3月1日周一"和"周末不工作"）。旧存档的 `2024-xx-xx` 日历键会在加载时自动迁移到2027，避免孤儿邀约角标永远清不掉。NPC消息安排的工作若落周末自动顺延到周一
- **[v10.51]** AI消息内容进度约束：早晨消息prompt注入"现在是Day N清晨、今天还没发生任何事、只能引用记忆列表里的事件、禁止编造试镜/导演/Netflix"（Day 1 特别强调无共同历史）；晚间经纪人消息、好感消息同样加约束。修复"Day1就说昨天导演问起你/Netflix回话了"
- **[v10.51]** 早晨消息时间戳改为 7:10-7:59（原为9点-18点随机，出现"早上8:07收到下午14:17的消息"）
- **[v10.51] 新功能**：手机聊天可回复——聊天页底部输入框，玩家发消息，NPC带人设/好感度/共同记忆上下文回复（文字聊天好感度影响减半、限±5）；输入框回车发送带 `isComposing` 检查（中文输入法不误触）
- **[v10.51]** NPC形象一致性方案落地：NPC立绘一经确认/首次生成即锁定（`portraitUrl`），之后场景改为"固定立绘卡片 + 单独生成的地点背景"（`showNPCScene`/`genLocationBg`，背景按 地点|风格 缓存于 `G.bgCache`），同一NPC不再每次长得不一样，还省生图费
- **[v10.51]** 过夜转场：入睡后先拉上夜幕（月亮+星空渐变），早晨诗意独白显示在转场画面上（从首页移过来），读完淡出并播放"新一天"音效（鸟鸣+琶音）
- **[v10.51]** 语音消息转写排版修复：转写文字原来是 `.wc-voice`（max-width:160px 的flex行）的子元素，展开时被挤成一列一字；改为独立块显示在播放条下方
- **[v10.51]** 未读红点：聊天返回列表时重新渲染（原来显示旧快照）；新消息到达时若正开着该会话直接标已读（`notifyNewMessage`）；回首页/晚间界面时重算徽章；同一天重复 `startDay` 不再重复生成消息（防"继续游戏"重复生成）
- **[v10.51]** 首页/晚间粉色渐变大幅减弱（顶部0.03，底部0.85，原来38%处就0.45），时钟/日期加白色文字光晕保持可读；场景切换时清残留背景图
- **[v10.51]** 自由日/日程旁白prompt改为侧重氛围与内心感受、不描写具体动作姿势（缓解文案动作与生图不符）；qa.js 过时的 `getDetShadow` 检查项改为 `getDetectiveShadow`

**v10.52（用户第二轮实测反馈 + Day1剧情改造）**：
- **[v10.52] 新系统：经纪人首月工作计划**。Day1 会面时生成 Day2-30 的必须行程写入日历（`source:'agent_mandate'`，每周3-4个工作日，剧情固定日计入当周工作量不重复排；任务池：乐队排练/录制Demo/声乐训练/舞蹈体能/定妆拍摄/媒体训练/制作人会面/词曲创作课，五语言标题）。Day1对话第二轮 npcContext 已改为公布月计划+可能临时加班+乐队+明天9点录音室见鼓手。必须行程日选项=行程(标"必须行程·经纪人安排")+2个社交（可翘）；翘掉→`playFree`标记`missed`→当晚经纪人晚间消息改为质问并扣5点好感（`missed_handled`防重复质问）。`calAddEvent`加了按id去重（"继续游戏"重复startDay不再重复添加事件），NPC消息安排会避开已有必须行程的日子
- **[v10.52] 新功能：NPC初次登场三选一**（鼓手等）：共用seed三个姿势的通用头像让玩家选，选中锁定为固定立绘并存回忆；DEV关图模式自动跳过。生图prompt全部改为"通用对话头像"——纯渐变背景无环境（女主三选一不再用浴室场景、经纪人三选一不再带办公室背景），因为立绘之后要叠在各种场景背景上，带环境会穿帮
- **[v10.52] 新功能：对话双头像框**：对话框上方左NPC右女主，NPC说话亮NPC，玩家台词回显时亮女主，旁白都不亮（`setVNAvatars`/`vnSpeak`）
- **[v10.52]** 剧情独白幕（原纯粉色占位）改为无人物地点背景（`genLocationBg`，带缓存）
- **[v10.52]** 晚间界面改为固定布局卧室夜景（`BEDROOM_LAYOUT`提示词=用户指定的小户型卧室书房一体布局，存`G.apartment.bedroomNightUrl`），不再用每次生成都和白天对不上的客厅夜景；旧档回退livingNightUrl
- **[v10.52]** NPC对话prompt禁止台词外的第一人称动作旁白（修"我没有回头。「我知道。」"指代不清）
- **[v10.52]** 新开局后手机/日历徽章残留旧计数修复（`startNewGame`重置后刷新徽章UI）；晚间"收到新消息"卡片显隐并入`updatePhoneBadge`统一按真实未读维护（看完消息回晚间界面卡片同步消失）
- **[v10.52]** 首页白天/晚上粉色渐变再减弱（顶部58%完全透明，底部0.7）；每日选项上方加"今天要做什么？"提示（多语言）

**v10.53（用户第三轮实测反馈）**：
- **聊天系统重做**：AI回复改结构化JSON `{reply, rel:-3..+3, endChat}`——不合适的内容会扣好感（不再几乎只加分）；NPC可在晚间"去睡了"后当天不再回复（`G.phone.chatEnded[npc]=day`）；回复延迟按人设习惯×好感度×时段计算（经纪人白天快、鼓手/演员夜猫子、管家早睡晚间大概率不回、侦探慢），30%概率"刚好在看手机"秒回，有"对方正在输入…"提示
- **消息发送门槛**：不再每个NPC每天必发，按好感层级概率（高90%/中45%/低18%）
- **日程grounding**：新增 `buildScheduleContext()` 把未来5天真实日历喂给所有消息/聊天prompt，禁止编造排练课程（修"问3月2日干什么答声乐课"、"明天排练别来了但日历是杂志拍摄"、编造"你昨晚发的消息"）
- **邀约结构化**：好感消息邀约改JSON `{text, invite:{daysFromNow(0=今晚), time}}`，日历日期严格匹配消息文字（修"今晚喝一杯"被排到7天后的bug）
- **首月计划补全**：Day2-5剧情工作日在Day1就写入日历（修"3月1日晚看不到明天安排"）；日历角标只数今天起的待处理邀约、过期自动作废（修"角标2消不掉"）
- **G.phase时段系统**：手机时钟/消息时间戳统一用游戏时段（修23:44聊天回复显示8:38、手机状态栏时间与主页不一致）；晚间界面显示星期·日期·第N天
- **经纪人人设转暖**：story.js culture/corePersonality/emotionalArc第1-2章、Day1三轮npcContext、晚间消息语气、生图expression 全部从冷酷改为亲和专业有温度
- **演员生图**加"playful flirtatious smirk"对齐撩人人设；**管家生图**加"unmistakably authentic {origin} ethnicity"（修选法国人生成韩国脸——插画风格+年轻角色描述权重盖过族裔特征）
- **卧室夜景三选一**：开局选完客厅后新增 s-bedroom 步骤（固定布局×三种灯光氛围共用seed），夜景prompt强化"LATE NIGHT、无夕阳无晚霞"
- **非工作剧情日**（如Day4）：剧情选项+2个"顺路逛逛"（`playFree(..., thenScripted)`逛完衔接当天剧情，不算翘班）
- **立绘展示**：独白幕只显示地点背景，进入对话才出现立绘卡片，卡片放大至92vw/430px；早晨诗意独白居中显示在画面中部；"今天要做什么？"加大加粗紧贴选项
- **新增项目skill `/story-check`**（.claude/skills/story-check）：剧情时间线/人称/grounding/人设一致性/泄密检查清单
- 待开发新增：Worker加抠图端点（fal rembg）实现立绘去背景

**v10.54（用户第四轮实测反馈）**：
- **消息单调时钟 `nextMsgTime(day, base)`**：同一天所有消息时间戳 = max(上一条, 时段基准)+1~6分钟，接入早晨批次/晚间经纪人/好感消息/聊天回复全部生成点（修"23:52后收到19:24"乱序）；手机状态栏时钟不早于当天最后一条消息（修"消息23:34状态栏22:30"）
- **对话布局重做**：取消对话中的大立绘卡片（`vn-npc-card` 仅剩 playScheduledEvent 无对话场景在用），改为对话框上方两个大头像框（各46%宽、3:4、谁说话谁高亮、点击放大）
- **场景对话 grounding**：`runVNDialog` 台词和收尾反应 prompt 注入 `buildScheduleContext(3)`（修鼓手说"明天九点再唱一遍"但明天是杂志拍摄）
- 街头签约对话加自由输入框（和正式对话一致，`judgeRelChange` 判好感）
- Day1 离开办公室改热情送客：离场旁白改"送到门口按电梯目送"，Round3 npcContext 改 warm send-off（不再"眼睛落回文件/头也没回"）
- 首页早晨独白加毛玻璃底卡（压在照片上可读），"今天要做什么？"加粗加白光晕
- 鼓手生图 NO glasses 加强为 "NO eyewear of any kind, bare face"

**v10.55（用户第五轮反馈：统一游戏时钟）**：
- **统一游戏时钟 `G.clockMin`（单一时间源，根本性方案）**：主页时钟、手机状态栏、消息时间戳全部读 `gameClockStr()`；实时消息推动主时钟前进1-5分钟，状态栏=主时钟，机制上不可能再互相对不上。startDay 置 8:07、goEvening 置 22:0x。"回溯模式"（backdated）：睡醒前的7点消息、补记前一天晚间的好感消息只保证内部递增、不动主时钟
- **日程上下文标注出席人** `[with the band leader]`/`[she goes alone]`，并禁止NPC对自己不出席的活动说"到时见"（修经纪人说"明天录音室见"但明天只有鼓手）
- **对话头像轮流出现**：NPC说话只显示NPC头像，玩家台词只显示女主头像（vnSpeak 控制 visibility）
- **管家生图**：彻底取消"40%概率戴眼镜"设定（一律 NO eyewear bare face），便服改楼管工作服（polo/工装马甲），加强禁背包措辞

**v10.56（用户第六轮反馈）**：
- **聊天带上下文**：sendChatReply注入该NPC最近10条聊天原文（YOU/HER标注），修"不告诉你→不告诉我什么？"失忆bug
- **场景对话注入地点**：runVNDialog prompt带CURRENT SCENE LOCATION（修约咖啡馆聊得像办公室，所有NPC通用）
- **好感晚间消息改当晚生成**（goEvening调用，每天一次守卫），睡前收齐当天全部消息；时间戳实时推进主时钟
- **普通行程图**：中远景抓拍、人物在环境中做事不看镜头；playFree/playScheduledEvent的图存入回忆（带活动名+天数标签）
- **聊天体验**：未读起始处显示"以下是新消息"分隔线（看完后下次打开消失）；打开会话稳定滚动到底（180ms补滚）；回复延迟整体加快约30%
- **晚间赴约系统**：goEvening入口检查当天accepted邀约→弹选择场景（多个撞时间只能去一个/都不去）；赴约=夜bar场景+轻量对话+5好感；爽约方-4好感并记入记忆（修3月9日两行程只触发一个 + 撞时间无处理）
- **行程遇NPC必触发对话**：新增runQuickNPCChat（NPC开场→自由输入/快捷回复→NPC收尾），playScheduledEvent带npcKey时自动进入（修录Demo遇鼓手没对话）
- **接电话功能**：聊天回复JSON新增call字段，NPC偶尔改打电话→全屏来电UI（接听进入通话界面可多轮对话/拒接-2好感）
- **好感度页重排版**：卡片式布局+生成立绘圆头像（点击放大，无立绘回退emoji）
- 日历打开默认选中今天；聊天prompt禁止口头新增工作安排+周末规则；NPC消息安排事件的prompt注明"落周末会顺延，措辞要与实际日期一致"

**v10.57（用户第七轮反馈）**：
- **【重要bug】晚间消息跨天**：goEvening的异步回调用G.day，玩家秒睡后G.day已+1导致昨晚消息挂到今天（"早上还收到昨晚消息"的根源）→ 开头capture `const evDay`
- **经纪人不再跟踪狂**：晚间消息只在工作日（他知情）或翘班质问时发送，私人行程他不知道；早晨消息概率降半（高0.5/中0.22/低0.08，最多2人）；连续3天不回某NPC消息→每3天-3好感+记忆
- **首页时段化**：首页/晚间只显示"早晨/晚上"不标具体时间（具体时间只在手机里，观感上不再对不上）
- **邀请制规则落地**：工作=日历默认（agent_mandate/剧情日）；私人邀请（吃饭/咖啡/节日）=消息邀约。Day5咖啡改为Day4晚上经纪人发邀约（接受→剧情、拒绝→自由日、进剧情即消化邀约防晚间重复触发）
- **消息约见面**：聊天JSON加meet字段，NPC同意当天见面→聊天里弹"🤝与XX见面"按钮→场景+3轮AI对话（白天晚上都可）
- **NPC发图片消息**：消息JSON加image字段（官宣截图/随手拍，稀用）→生成图片气泡可放大
- **三选一差异化**：女主/经纪人/NPC三张图改用不同seed（base+7919i），选中锁定对应seed；场景图失败自动降级简化prompt重试（修市集/酒吧图不出）
- **形象强化**：genNPCPortraitPlain统一追加禁眼镜/背包/未成年化token；管家改"mature young adult NOT teenager"
- **聊天/好感度页头像图片化**（气泡+会话列表+女主，回退emoji）；晚间"收到新消息"卡片列出全部未读NPC并点进消息列表
- **日历**：角标=待处理邀约+未查看新安排（打开日历后新安排提示清除），事件卡带NEW标；接受/拒绝后刷新当日选项
- **新地点**：菜场/超市/美容院/美发店/商场；**美发店可改发型发色**→原seed重生成头像并更新形象+存回忆
- Day1 preText改热情迎接（4语言）；"男演员"→"演员"；对话结束旁白时双头像隐藏；new-day音效改柔和琶音（原来像口哨）
- 待开发新增：官宣假新闻页UI（点开消息里的链接卡看全文）、家具店购买家具重新装修

**v10.58**：
- 卧室三选一的 B 张改为 `BEDROOM_LAYOUT_B`（用户指定：长方形卧室、中央双人床、两侧对称床头柜+窗户、床上吊灯、右侧梳妆台竖镜、床尾脚凳、左下角单人椅、大地毯）；A/C 仍为小户型书房一体，B 的灯光mood同步改为双床头灯而非书桌灯
- 美术风格一致性核查结论（无代码问题）：`img()` 对所有图统一在最前面加 `STATE.imagePrompts.styles[G.imgStyle]`（默认illustrated）前缀，各 `build*Prompt` 均不自带画风词，所以**不改设置时全部NPC含管家画风完全一致**。管家看起来偏卡通是**内容描述词**导致（年龄20最小、slim youthful build、"innocent features, slightly flushed cheeks"、默认Korean族裔）把同一画风带偏，非风格设置不一致。若仍要弱化：删管家prompt里的"slightly flushed cheeks / innocent features"、把年龄措辞再成熟化

**v10.59（用户第八轮反馈，含v10.58后未推送的累积项）**：
- **剧情补见系统（方案A）**：`G.scriptedDone`标记每个剧情日是否玩过；`getPendingScriptedDay()`找最早未完成的剧情日作为"今日剧情"（标注"补上错过的"），玩家用约会/自由活动绕过登场日（如Day3没见男演员）也不会漏主线人物；工作类剧情不顺延到周末；Day5拒绝/过期邀约视为已处理；旧存档按npc.met回填标记
- **NPC邀约不再约当天**：晚间好感消息的邀约daysFromNow改1-6（prompt明确"现在是深夜，最早约明天"），修"晚上回家后才收到今晚19:30的约"
- **生图物体否定词教训（重要，容易再犯）**："NO backpack/NO glasses"这类否定式对flux无效甚至反向诱导（提到物体名就更容易画出来）。管家/鼓手prompt和genNPCPortraitPlain已全部改为不提物体词、只正向描述（"只穿polo工作衫、双手空垂、光洁无须娃娃脸"）；管家改"Boyishly handsome...college-age big-boy look, clean-shaven completely beardless"（大男孩、无胡子）
- 见面场景结束旁白用实际见面地点（修约吃饭却显示"拍摄结束"——原来借用当天剧情事件的地点）；`_vnEndLoc`机制，剧情场景入口清空
- 聊天见面地点枚举补全（magazine_shoot/recording_studio/music_training/rooftop/livehouse），要求AI按玩家实际提议的地点选（修约陪拍摄却是街道背景）
- 卧室三选一B张改用户指定的双人床布局（`BEDROOM_LAYOUT_B`）
- 日历每次打开默认选中今天（不保留上次离开时选的日期）
- 已确认现状（无需改）：白天行程结束→自动触发当天已接受的19:30邀约→之后才回家过夜，链路已通；管家出场固定工作服+空手

**v10.60：压力值系统（用户设计，数值为初版可调）**：
- `G.stress` 0-100：工作（必须行程/剧情工作日/NPC安排）+12、职业投资+8、非工作剧情日+5、休息-15（周末-20）、见面/晚间赴约-5、病中每天-35
- **每日三段式选项**：①必须行程（日历）②职业投资（`getCareerOps`：声乐/钢琴/吉他/形体课/健身房/画廊找灵感，+2知名度+8压力）③休息（`getLeisureOps`：咖啡/公园散步/逛街/市集/超市/美容美发/书店，-压力）；无必须行程日=1职业+2休息；旧的自由日workOps不再使用
- **病倒**：压力满100→次日病倒（知名度-8），强制卧床3天；每天按好感度排序轮流1位NPC上门探望（`playSickDay`+`runQuickNPCChat` custom语境，探望+2好感）；早晨消息全员90%概率发关怀（最多4人）、经纪人晚间发慰问；病中必须行程标`sick_excused`不算翘班；3天后痊愈压力≤20
- **UI**：首页日期下压力芯片（🙂/😮‍💨/😰+数值，≥80红色加粗）；知名度页压力条（<50绿/50-79橙/≥80红）+状态提示文案
- 新地点：dance_studio/gym/park；数值用户尚无概念，之后按体验反馈调
- 修复：buildDayOpts病倒分支曾放在makeOpt定义前导致TDZ报错（冒烟测试抓到），已移到定义后

**v10.61：人物图质量开关（flux/dev 试验）**：
- `img()` 加第6参 `hq`：`hq && G.hqPortraits` 时 body 带 `model:'fal-ai/flux/dev'`+28步，否则 schnell+4步；人物生图点（NPC三选一/genNPCPortrait/女主三选一/经纪人三选一/美发店重生成）传 hq=true，背景/场景仍 schnell 省钱
- 设置页新增"PORTRAIT QUALITY 人物图质量"开关（标准/高质量，默认标准，存档持久化）
- **Worker 端需配合改**（Cloudflare Dashboard → off-the-record-api → /image 路由）：
  `const ALLOWED=['fal-ai/flux/schnell','fal-ai/flux/dev']; const model=ALLOWED.includes(body.model)?body.model:'fal-ai/flux/schnell';` 然后用 `https://fal.run/${model}` 转发（原来是写死 schnell 的URL）。Worker未更新时游戏发的 model 字段被忽略，不影响现网
- 交接文档确认：无 Cloudflare 凭证（只有 GitHub token），Worker 只能用户手动在 Dashboard 改

**v10.62：官宣新闻页 + 家具店装修（清掉两项待开发）**：
- **官宣新闻页**：早晨消息JSON新增`news`字段（极少用，仅官方公告/报道）→聊天里显示"📰 DAILY ENCORE"报道卡片→点开全屏假新闻页（报头/标题/日期/配图/正文，`#news-overlay`+`openNewsPage()`），配图复用消息的image字段生成
- **家具店装修**：休息类新增"逛家具店"（`furniture_store`地点）→到店后可选三种客厅风格（现代简约/温馨软装/复古混搭=LIVING_LAYOUT A/B/C）→重新生成客厅白天图并更新`livingDayUrl/selectedLayout/selectedStyle`+存回忆，或"只是逛逛"
- Cloudflare Worker 仍需用户手动改（凭证获取方式已告知用户：API Token "Edit Cloudflare Workers" 模板 + Account ID）

**v10.63（用户第九轮反馈，13项）**：
- **聊天未来邀约（修2个bug）**：聊天JSON新增futureInvite字段——约未来日期（"6号晚上""明天"）直接写日历（status accepted，到当晚触发赴约）；meet字段严格限定"今天"，不再把约明天误弹成马上见面按钮
- **约会系统丰富化**：新地点山顶夜景/海边(仅LA、悉尼、纽约、东京)/电影院/音乐厅/歌剧院；DATE_SPOTS按NPC性格挑约会地点（经纪人=音乐厅歌剧院、鼓手=livehouse山顶、演员=电影院天台、管家=公园咖啡、侦探=书店山顶）；playInviteScene从单轮固定寒暄改为3轮对话+8个随机话题种子+按好感度分寸的暧昧张力（修约会重复无聊）；runMeetupScene同样注入种子
- **删除Day5经纪人咖啡剧情**（story.js事件+全部特判，Day5正常排班）；日程上下文加入accepted私人约会（修"经纪人说今天没行程但下午有咖啡约"）
- **长对白分页**：NPC台词>110字且问句收尾→第一页读前文点"继续"，第二页问出问题+回复UI
- **空发送=无言划过**：场景对话/偶遇对话输入框空按➤=沉默回应"……"（0好感变化）
- **每周一 DAILY ENCORE 新人热度周榜**：rank≈200-fame*1.8±3，经纪人转发新闻卡（含涨跌对比、burnout警示文案），事业紧迫感
- 睡觉-6压力；名气增速放缓（工作+5→+3，职业投资+2→+1）；管家表情改惊喜开心（delighted joyful, eyes lighting up）；日历邀约拒绝后"发消息说明"直接打开该NPC对话框；底部日历图标改为显示游戏内当天日号（📅emoji在部分系统固定显示17）
- 待讨论（方案已给用户）：约会后过夜暗示剧情、经纪人稀有机会事件（制作人/蒙面歌手/广告/电影，一年数次不可错过）

**v10.64（用户第十轮反馈，15项，含过夜剧情上线）**：
- **过夜暗示剧情**：晚间约会（非白天约）好感≥75时对话收尾触发（`_afterDialogHook`钩子+`maybeStayOver`）——NPC按人设含蓄邀请，三选项：留下（+10好感、`nights`计数、夜幕渐隐+含蓄旁白直接进第二天、次日收到心照不宣的早安消息）/婉拒（+3好感、NPC得体反应）/装没听懂（轻带过）。全程含蓄留白不出图
- **白天/晚上约会分流**：`invTimeMin()`——<17:00的约占白天行程（buildDayOpts里"💌赴约"选项），到晚上没赴=爽约扣好感；≥17:00才走晚间弹层（修"12:30午餐却提示今晚你有约会/晚上才触发"）；playInviteScene按时段选昼/夜地点池（修中午约饭出夜晚酒吧图）
- **城市地标约会景点**：8城×2个地标（布鲁克林大桥/格里菲斯天文台/塞纳河/涩谷天空台/南山塔/悉尼歌剧院步道等，`CITY_DATE_SPOTS`运行时注册进STORY.locations），双倍权重加入约会池；DATE_SPOTS重构为昼/夜双池；**邀约生成前先选好地点并注入prompt措辞**（修"经纪人永远约吃饭"）
- **好感度全局放缓**：`relationships.change()`统一×0.6（正负都温和化）；初始值调低（经纪人30→15、鼓手35→12、演员15→8、管家20→10）
- **记忆时间换算**：buildDialoguePrompt注明"今天是Day N，记忆按Day标签正确换算相对时间，只有Day N-1才叫昨天"（修3月3日的事3月5日说成"昨天"）
- **族裔选项删除日本人/韩国人**（5个数组同步删，12项对齐；npcAppearance定义保留作fallback）
- 晚间界面文字改浅色+深阴影（压暗色卧室图可读）；知名度页加"⭐知名度/😮‍💨压力"标签行（两条进度条可区分）；晚间独白移到过夜转场（替代雷同的早晨句，晚间界面不再显示）；聊天/签约空发送=发"……"沉默划过；HQ生图时console.log标记（`[IMG] HQ flux/dev`）便于确认生效
- **HQ"没变化"诊断**：代码链路正常（Worker已实测dev出图）。主因=已锁定的立绘直接复用URL不会重新生成——开关只对**新生成**的人物图生效，需新开档或初见新NPC才能看到差异

**v10.65**：
- 女主独自行程图（genProtagonistScene 主+降级路径）接入HQ开关（开=flux/dev 28步）
- 过夜"留下"改造：生成一张沙发依偎暧昧图（相拥、盖毯、着装完整、暖光+窗外夜景，含蓄尺度，走HQ开关，seed用该NPC的portraitSeed）作为场景图并存入回忆，按钮"相拥而眠"→夜幕转场进第二天；生成失败自动跳过直接转场

**v10.66**：
- **初见立绘全屏展示**：NPC三选一确认后先全屏展示选中的立绘（`#portrait-full`，点击继续），之后才进入对话
- **对话中点背景图隐藏/显示对话框**（`toggleVNDialog`，vn-bg 的点击从 openLB 改为切换；场景入口复位显隐状态）
- 用户报"过夜没生成沙发图"= v10.64 缓存旧版行为（沙发图是 v10.65 加的），代码复查无问题，强刷验证

**v10.68（睡前授权批次：第一章内容补完）**：
- **双人场景图**：新增`genCoupleScene(npc,loc,day,activity)`（女主+NPC同框、按人设外形拼prompt、seed用NPC的、走HQ=flux/dev），接入见面(runMeetupScene)/约会(playInviteScene昼夜文案区分)/同行行程(playScheduledEvent带npc)，成功存回忆、失败回退无人物地点背景
- **存档槽**：最多3个本地备份（otr_save_slot_1/2/3）。新开局先问"要备份当前进度吗"；标题页有备份时显示"读取备份(N)"按钮（prompt选槽→写主档→reload走原地合并）
- **知名度页**：移除知名度进度条（等级列表已表达进度），保留压力条；相关元素display:none保留id防renderFame报错
- **Day1-4对话全部重写**（12段npcContext导演指令，按最新人设：经纪人=暖主人姿态+具体到"雨夜六人街头场"的签约理由；鼓手=craft外科手术式点评+背后那句"高音明天再来"；演员=撩里藏一秒真心+真号码写在通告单上；管家=大男孩被抓包送蛋糕+藏不住的开心）
- **第一章补完3个剧情日**：Day12乐队首次合练（鼓手当众留她的part+教练习+"你的歌排第三首"）、Day22深夜大堂（管家自费修好走廊灯+"汤做多了"+问灯其实不是问灯）、Day30章末深夜加练（关灯唱高音→他忘了打鼓三秒→"明天睡懒觉"他给过的第一个假）；Day30进场trigger drummerHeardHighNote、晚间门口黑森林蛋糕卡（trigger butlerLeftBlackForestCake+管家好感）
- **教训**：新剧情日必须避开周末（原排Day14=周日被"周末不排工作剧情"规则挡住不显示，冒烟测试抓到，移到Day12周五）。加剧情日先查 `new Date(2027,2,D).getDay()`

**v10.69（用户第十一轮反馈"第一章打磨"10项 + code-review修复10项）**：
- 诗意独白只保留过夜转场画面（白天首页/晚间界面移除；非转场路径不再生成独白，省一次调用）
- **双人图彻底移除**（genCoupleScene删除）：flux纯文字生图锁不住两张脸，"两个女主合影"bug根治——约会/见面/同行行程全部改无人物地点背景；NPC同行行程生图失败/关图/429时回退 showNPCScene（已锁定立绘免费显示，不再全程粉屏）
- **对话"爱理不理"根修**：玩家上一轮原话经 `_vnLastReply` 注入下一轮prompt（NPC必须先回应再推进剧本方向）；场景开场（round 0）和收尾都清零，防跨场景泄漏（玩家中途从底部导航跳去手机再进别的场景）
- **工作见面 vs 约会对话分流**（用户定义的三块互动：手机对话现状好未动）：工作行程见面=聊手头/最近共同工作话题+专业场地动作+好感只影响分寸温度（runQuickNPCChat `_workCtx`）；约会=兴趣爱好/展现自己/适度透露隐私话题池（DATE_TOPIC_SEEDS重写）+按地点动作库 `DATE_ACTION_HINTS`（海边拂发/餐厅拉椅/影院递爆米花/工作场地探班等）；两者一律禁止心理描写、每轮换不同动作
- **邀约绝对日期**：`upcomingDatesRef` 日期对照表注入晚间邀约/早晨消息/聊天三处prompt，消息文字必须写星期/日期、禁用"明天"（晚上发的"明天"第二天早上读就错位成后天）
- **买衣服换装**：商场行程输入颜色款式→3张新装头像三选一→替换女主头像。三张同seed（换衣不换脸，换seed会漂移形象体系）、并行生成、纯ASCII输入跳过翻译调用
- 家具店选风格后改为3张候选（不同seed、并行生成）三选一再替换客厅；新增通用 `inlineTrioChooser`（含防双击）
- 美容院固定构图（近景：白衣口罩理疗师面部按摩、她闭眼躺床脸部清晰、昏暗SPA串灯）——**注意分支放在 publicSceneCount/侦探剪影计算之后**，美容院是公共场所要参与Day20+伏笔节奏
- 拍摄类行程（定妆/杂志/品牌/颁奖）人物prompt加舞台妆+编辑大片感后缀（不再像生活照）；magazine_shoot布景描述同步编辑化（布景与人物妆造分开写，布景还要给无人物背景用）
- 过夜改造：邀请措辞按 `nights` 计数分化（已过夜后不再"再喝一杯"式初次借口）；"留下"撤掉v10.65沙发图，改AI生成的含蓄撩人文字（贴耳低语/解扣/落地窗后拥式意象，门槛处淡出，有固定文案兜底）
- **code-review另抓到的存量bug**：白天赴约（v10.64起）从首页直接进 playInviteScene 不切屏，整场约会在隐藏DOM里跑完——已补标准场景入口；相册重复存缓存背景图（新 `pushGalleryUnique` 按URL去重）
- 遗留清理项（记录未做）：MIRRORS姿势串/种子三元组[+7919,+15838]/ACTION RULE句/设置背景图三行DOM 的多处重复待提取helper；glam地点清单建议改成story.js条目上的标志位；upcomingDatesRef 与 buildScheduleContext 的日期格式待合并（同prompt里两份日历，改起始日期时易失同步）

**v10.70（过夜转场星空背景）**：
- 过夜转场（入睡→第二天的夜幕画面）加AI生成的星空背景图（`#nt-sky`，月亮+独白压在上层，用户指定的固定prompt=深靛紫渐变星空、中央留白给独白）。存档缓存复用（`G.nightSky={url,day}`），每 `NIGHT_SKY_REFRESH_DAYS`（=10，可调）个游戏日换一张；`ensureNightSky()` 在 goEvening 后台预生成/到期换图，生成失败或还没好时回退原CSS星空渐变、不阻塞转场

**v10.71（女主专辑 · 音乐播放器,模拟真实听歌软件）**：
- 手机新增"音乐"tab(🎵):显示女主的专辑(封面/专辑名/艺名=`G.player.name`/曲目列表),点曲目→全屏 Now Playing(大封面+艺名+进度条可拖+播放/暂停/上下曲+**随播放高亮居中滚动的歌词**);收起(⌄)继续后台播放,和真实听歌软件一致
- **占位数据**:10首都指向 `repo/music/Together We Shine.mp3`(用户放的占位歌),专辑名占位 `XXX`,占位LRC歌词。**替换方式**:改 `getAlbum()` 里的 tracks(title/file/lrc)即可上线真正10首;歌词用标准 `[mm:ss.xx]` LRC 格式,`parseLRC()` 解析
- **技术**:单个 `<audio id="player-audio">` + inline事件(ontimeupdate/onended/onplay/onpause);歌词按 currentTime 找当前行高亮+`scrollTo`居中;文件名空格用 `encodeURI` 处理
- ⚠️ **托管教训**:占位期1首MP3(~3MB)放 `repo/music/` 可以;但**正式10首(30-40MB)别塞git仓库**——拖慢仓库+吃GitHub Pages流量,上线前要迁到 Cloudflare R2/CDN 单独托管、按需加载。`file` 已设计成路径/URL,到时改地址即可
- 这也给第2章"专辑企划"提前铺好了能用的播放器

**v10.72（AI失败可见化 + 开发者额度自助命令）**：
- **失败可见化**:撞每日额度(429)/网络/CORS失败时,`claude()` 改为优雅返回空串(之前网络错误会throw把场景冻结在"...")；场景对话(runVNDialog)、快速对话(runQuickNPCChat)、手机聊天(sendChatReply)在AI返回空时都显示 `aiFailMsg()`「AI内容暂时无法生成,可能今日额度已满,明天恢复」+出口按钮,不再空白卡住(模拟真实玩家看到的降级体验)
- **开发者后台命令**(浏览器控制台F12):`otrNewQuota()` 换新设备ID→满额;`otrQuota()` 查当前设备ID。详见 §4 DEV MODE
- 背景:用户密集测试撞到每日400次/设备的额度,表现为"NPC对话和名字都不出来"(对话空白+只显示角色标签)。查证后端/API健康、代码无回归,是额度问题;顺手做了失败可见化让未来玩家不会看到神秘空白

**v10.73（用户第十二轮反馈·第一批:配置改动）**：
- **人物图默认Dev**:`state.data.hqPortraits` 默认 false→true。人物立绘/头像走 flux/dev(28步,画质与解剖服从度高,修"背后长胸"类schnell崩坏);背景仍schnell省钱。旧存档保留原值,新档默认Dev。设置页开关仍在
- **城市换血**:取消东京、首尔→**芝加哥、多伦多**(欧美音乐娱乐名城,迎合西方市场)。改动点全清:en/zh-cn/zh-tw三处显示数组、cv英文值数组、cityLandmarks×2、COASTAL_CITIES(去Tokyo,芝/多是湖畔非海滨不解锁ocean beach)、CITY_DATE_SPOTS(芝=海军码头/千禧公园云门,多=CN塔/多伦多海滨)、story.js四季氛围、qa.js。grep验证零残留
- 待续批次(已排):本地化残留(卧室页/Tell me about him/and so it began等英文没翻)、文案(选择他的形象→这是我看到的他、独白重复、公寓漏字)、场景对话Bug(对话框挡脸移不动、回复没接玩家输入、红白字、长对白分页、美容院图被挡)、过夜场景背景错(游乐园/录音棚)、经纪人签约剧本改暖、UI字号单独一批。**"周五7:14"经查是开场旁白硬编码stamp(open_stamp),非日期bug**

**v10.74（用户第十二轮反馈·第二批:确认过的内容改写）**：
- **经纪人签约剧本改暖**（story.js 签约场景narration,4语言）：原"他没抬头把合同推过玻璃桌面/你拿起了笔"冷淡且突兀→改"他起身笑着走来、目光落在你身上、把合同轻轻推来、'剩下的路我们一起走'、你签下名字、从这一刻起一切都不一样了"（暖+签约明确+收尾不突兀）
- **去掉"24楼"具体楼层**（签约narration + Day1办公室intro,4语言）：改"城市高处/高层"——修①反复提24楼②文案说24楼但生图像100楼的矛盾（楼层不写死,图是啥楼都不冲突）
- **男演员Day3对白导演指令重写**（3轮npcContext）：原指令太"表演笔记"式(one dropped second/charm drops)导致输出莫名奇妙紫色→简化为具体beat+强制"grounded/natural/plain,no purple speeches"，产出更像真人说话
- 待续（用户继续测中）：本地化残留、其余文案、场景对话Bug（对话框挡脸/红白字/长对白分页/美容院图被挡）、过夜场景背景错、UI字号

**v10.75（用户第十二轮反馈·第三批:本地化残留）**：
- **onboarding英文残留补齐**:卧室页(Choose your bedroom/Where the day ends/This is my bedroom)、This is my home、That's me、That night、Tell me about him、Where was he from?/举止那句、I remember him、HIS NAME、And so it began、↺New options——这些之前写死英文没走语言系统。3个无id按钮(That night/Tell me about him/HIS NAME)补了id,其余本来有id只是applyLang没覆盖。**改法**:applyLang末尾加一段自包含 `L(zh,en,ja,ko)` 本地化块(不动巨型TX对象,零风险),4语言。"选择语言"现在对这些也生效
- **文案两处**:①"选择他的形象"→**"这是我看到的他"**(用户要求)②flashback stamp"每一个夜晚,几个月来"→"几个月前·街头"(去掉和旁白"每天晚上"的重复)
- 已验证:zh全中文零英文残留、en回退正常、无报错
- 待续(用户继续测):场景对话Bug(对话框挡脸/红白字/长对白分页/美容院图被挡)、过夜场景背景错、UI字号

**v10.76（用户第十二轮反馈·第四批开始:场景对话）**：
- **停用长对白分页**（runVNDialog 内 IIFE 顶部直接 return）：用户反馈"台词要一次说完,别切成两页"。分页逻辑保留备用
- 红/白字说明（未改,归UI批）：`.vn-text` 旁白=白(#FFF0F3)、`.speech` 说的话=粉(#FFB8C8),是VN"高亮台词"惯例。用户觉得confusing→颜色决策放UI批统一处理
- 待续:对话框挡脸(UI批)、签约首轮回复没接玩家输入(需查signing scene是否走runVNDialog)、过夜场景背景错、美容院图被挡、UI字号

**v10.77（用户第十二轮反馈·对话文字两修）**：
- **台词高亮不一致修复**（formatNPCText）：AI 有时用『』或弯引号“”，而高亮只认「」/直引号→同段里有的台词粉色有的漏成白色。归一化:弯双引号→直引号、『』→「」(不动弯单引号防误伤撇号)，再统一高亮。实测三种引号都一致高亮
- **禁止动作夹在台词中间**（runVNDialog OUTPUT RULES）：原来会出现「台词前半」动作。「台词后半」。加规则"台词一次说完,动作只能放整句话前或后,不能夹中间"。（这才是用户"台词一次说完"的真实诉求；v10.76停的是页级分页,是另一回事）

> ⚠️ **部署延迟教训（2026-07-03）**：连推 v10.71-76 后线上卡在 v10.73——GitHub Pages 有部署记录但 CDN 边缘缓存/构建传播延迟(可达10min+)，换浏览器无效(边缘缓存共享)。**对策:攒几个改动再push一次,别频繁推**(频繁push可能让Pages构建排队)。代码不丢,等边缘缓存刷新即到最新

**v10.78（用户截图·onboarding本地化第二轮:按钮+血统页）**：
- **Continue/Generate按钮全本地化**:开场/姓名/母/父/发型/城市页的"Continue"、"Generate my apartment"(→生成我的公寓)——之前全写死英文。2个无id按钮(开场509/姓名520)补id,其余applyLang补齐,4语言
- **姓名页**:占位符"Your name…"→"你的名字…"、hint"This is how everyone will know you."→"大家会用这个名字认识你。"
- **血统页彻底本地化**(HERITAGE_L10N映射表+showHeritage重写):原来"我母亲来自African/North American"和卡片"眼睛Rich dark brown/肤色Fair…/血统African×North American"全是英文原始值。现按9个族裔×zh/ja/ko映射(族裔名o/眼睛e/肤色s),en及未知语言仍用英文原值。实测zh"我母亲来自非洲…眼睛浓郁深棕色眼/肤色白皙带暖金色晒痕/血统非洲×北美"、en回退正常
- 教训:onboarding英文残留分散在多处(HTML写死按钮+动态拼接的值),需逐页扫。已修两轮

**v10.79（用户反馈:美发店没换发型选项）**：
- **互动店铺在剧情日"顺路逛逛"也能用**:美发/家具/商场原来有 `&& !thenScripted` 守卫——只有自由日给选项,剧情日(如Day1)当"顺路逛逛"进去只有旁白+继续,没换发型/换装/换客厅选项(用户在Day1撞到)。现去掉守卫,三个函数都加 `thenScripted` 参数,完成后:顺路日→`playScripted`继续当天剧情、自由日→`goEvening`入夜
- 待续:签约首轮回复没接玩家输入、过夜场景背景错、美容院图被挡、UI批

**v10.80（用户反馈修正3项）**：
- **长对白分页恢复**（撤销v10.76的停用）：这本是用户需求(防止选项在一屏放不下)，我上次理解偏了停错。用户真正要的"台词别被动作夹断"由v10.77的OUTPUT RULES管，两者不冲突
- **开场stamp 周五→周一 / Friday→Monday**（open_stamp en+zh-cn+HTML默认）：契合"游戏第一天=周一"。时间线也自洽:遇经纪人是周五晚(agent_intro_nar保留周五)、三天后签约=周一=Day1
- **签约场景改AI响应式**（用户确认）：签约是独立引擎runSigningDialog(全脚本)，NPC台词写死不理玩家输入。现Round1(经纪人回应)改AI生成——先回应玩家上一句具体说了什么、再暖着表明选择性并请她来电详谈；story.js该round加`respond:true`，脚本getNPCLine作方向+兜底(AI失败/额度满回退)。开场第一次NPC互动不再"像程序"
- 待确认:过夜背景方向(见对话)；待做:美容院图被挡+UI批(字号/对话框挡脸/红白字)

**v10.81（用户确认:过夜场景重构）**：
- **过夜背景=NPC各自的家**（用户选）：新增 `HOME_PROMPTS`(5个NPC各自住处风格:经纪人高层豪宅/鼓手loft/演员设计师公寓/管家温馨小屋/侦探noir公寓)+`genNPCHomeBg()`(按NPC缓存复用省生图,暖暗私密夜景无人)。修"游乐园约会过夜背景还是游乐园"
- **"留下"流程重构**（用户设计）：约会大多在公共地点→邀请措辞改"邀她回我那儿"、选项改**"跟他走"**→选后**背景切到他家**→在他家出含蓄撩人文字→"夜还很长"进第二天;若本就在他家(locKey以_home结尾)选项才是"留下"。婉拒/装没听懂不变
- 待做:美容院图被独白框挡、UI批(字号/对话框挡脸/红白字配色)

**v10.82（UI批·用户第十二轮反馈收尾:字号/配色/对话框挡脸）**：三项方向均经用户确认后实施
- **红/白字配色拉大区分**（`.vn-text`）：旁白从近白粉 `#FFF0F3` 改中性偏暗暖白 `#E9DFE1`（读作"安静的旁白"、退后），台词保持粉但从 `#FFB8C8`→`#FFB2C6` 并加柔和外发光 `text-shadow:0 0 10px rgba(255,150,180,.28)`（"跳"出来但不刺眼）。用户之前觉得两色 confusing→现靠"旁白变暗中性+台词发光"拉开，非只靠色相
- **VN字号整体上调一档**：`.vn-text` clamp(15,4.2vw,20)→clamp(16,4.6vw,22)、`.vn-opt` (15,4.5vw,18)→(16,4.8vw,20)、`.vn-input` (14,4vw,16)→(15,4.2vw,17)、`.vn-speaker` 12→13px。针对30-50岁用户手机可读性
- **对话框挡脸=用户选"只靠点击收起"**（不改布局，立绘 top3%/max52vh 与底部对话框 max50vh 中段重叠维持原样）：补一个**一次性轻提示** `vn-tap-hint`（首次出现固定立绘时淡入5s、localStorage `otr_vn_taphint` 记住只提一次、4语言）"点画面放大·点背景收起对话框"，让已有的"点图开lightbox看大图/点bg toggle对话框"两个功能可发现。美容院图被挡同此解（点图即可全屏看清）
- 改动全在 index.html（CSS+`showVNTapHint()`，showNPCScene显示立绘处调用），纯前端零风险；已静态核对语法与三处版本号(v10.82)
- **UI批至此清完**（字号√/红白字√/对话框挡脸√）。剩余历史待续项若用户再提再处理

**v10.83（用户第十三轮反馈:立绘表情/背景混人/约会跑题/过夜按性格 + 开发者测试命令）**：
- **经纪人立绘变严肃修复**（两处根因）：①`buildAgentPrompt` 表情措辞从 `warm approachable expression, relaxed confident smile, composed friendly presence`（带"composed"压制笑、被flux/dev写实渲染成严肃商务脸）改 `a genuine warm smile, kind eyes crinkling slightly, relaxed and approachable, easy friendly charm, clearly smiling not serious`；②三选一共用 `poses` 原含 `arms crossed`(抱臂=封闭)、`calm direct gaze`(中性冷)会压过各NPC自身表情→改为纯取景角度 `facing the camera directly / relaxed three-quarter angle / slight side angle turning toward the viewer`。设定是"冷改暖"，笑容现由各build*Prompt自己的表情句驱动，poses不再干扰
- **地点背景混进人**（`genLocationBg`）：flux对否定词不敏感，办公室/咖啡馆等会自动填人。prompt加强正向"空无一人"措辞（completely deserted, absolutely nobody in frame, not a single person or figure or silhouette, architectural/scenery photograph with no subjects…）降低概率，无法100%消除(flux固有局限)。⚠️旧图已缓存在 `G.bgCache`，需 `otrClearBg()` 清缓存才会重生成
- **约会文案跑去录音室**（`playInviteScene` 的 `flirt` 串）："not a work meeting"太弱，压不过 buildDialoguePrompt 注入的"职业=talent agent"+满是录音室/乐队的记忆。加硬禁令：THIS IS PERSONAL TIME—禁录音室/乐队/鼓手/排练/歌单/合约/试镜/经纪业务/职业后勤，"你是以对她有意思的男人身份在场，不是经纪人/同事"
- **过夜暧昧文案按性格差异化**（新增 `OVERNIGHT_STYLE` 映射，注入 stayNar prompt）：原来所有NPC共用通用动作模板(关门/耳边低语/解第一颗扣子/从背后揽腰)。现按性格：经纪人=从容笃定的暖(deliberate/savoring/给她迎上来的机会)、鼓手=少话用手/急切但最后一秒放柔、演员=玩味表演却露真心、管家=青涩发烫手抖用眼神问、侦探=克制精准一个动作胜千言。prompt明确"占有欲强的/害羞的/克制的读起来要完全不同，别默认通用模板"。HARD RULES(止于门槛/不露骨/淡出)不变
- **开发者测试命令**（F12）：`otrTestStay(npcKey, locKey)` 直接跳进任意NPC过夜场景测邀请台词+跟他走后的性格化文案(自动设好感80，默认agent/rooftop；locKey以_home结尾=已在他家)；`otrClearBg()` 清地点/家背景缓存重生成(用于重刷混进人的旧图)
- 已起独立server验证:零JS报错、v10.83、otrTestStay/otrClearBg已注册、OVERNIGHT_STYLE五NPC齐、经纪人prompt含强笑容措辞。改动在 index.html+state.js
- 待用户实测确认:笑脸是否够暖、背景混人是否减少、约会是否不再talk shop、五个NPC过夜文案性格是否拉开

**v10.84（手机版开发者测试面板）**：用户在手机上测，没有F12/`javascript:`地址栏也被移动端浏览器拦截→做了游戏内隐藏面板
- **触发**：标题页连点版本号(`#ver-tag`, onclick=`devTap()`)5下(2.5s内)→右侧悬浮 `⚙DEV`(`#dev-fab`)出现，弹alert提示。之后 ⚙DEV 常驻(顶层元素,跨屏保留)，点开 `#dev-panel` 全屏按钮面板
- **按钮**：过夜×5(经纪人/鼓手/演员/管家/侦探→`devStay(k)`→`otrTestStay`,好感自动80直接跳场景)、清背景缓存(`otrClearBg`)、重置额度(`otrNewQuota`)、关闭。`devStay`若G未初始化(还没进游戏)会提示先开始/读档
- DOM放在 lightbox 后(顶层,不在.screen内所以跨屏保留)。已mobile尺寸截图验证渲染+8按钮+零报错
- 控制台命令(otrTestStay/otrClearBg/otrNewQuota/otrQuota/otrNewQuota)仍可用,面板只是手机友好的入口

**v10.85（用户第十四轮点子·Batch1:过夜两幕 + 管家被动版）**：用户一大批点子分5块按序做，这是第1块
- **过夜改两幕**（`maybeStayOver` 内 `goHomeAndStay`→第一幕、新增 `goAct2`/`leaveAfterAct1`）：跟他走/留下→**第一幕**(进他家,试探性暧昧:各NPC一个标志性场景+道具,`OVERNIGHT_ACT1` 经纪人吧台倒红酒/鼓手loft沙发放唱片/演员阳台递酒/管家小厨房泡茶手抖/侦探书桌递威士忌,停在第一个撩人触碰)→**选择**「让这一刻继续」or「今晚到这里就好(离开)」→继续=**第二幕**(背景换床/沙发 `OVERNIGHT_ACT2`,更撩,此时才 nights++/好感+10/记 `_stayedOver`)→夜幕转场进第二天；离开=好感+4、不记过夜、回家睡到第二天
- **背景**：新增 `genNPCHomeActBg(npcKey,act)`,按 NPC+幕 缓存(`homeAct1Url`/`homeAct2Url`),沿用强"无人"措辞。`otrClearBg()` 已同步清这两个新字段
- **管家过夜=女主主动/他被动**（`isButler` 分支）：两幕prompt都写成他害羞被动、女主leans in taking initiative、他ears burning跟随
- 旧单幕 `genNPCHomeBg`/`homeUrl` 保留未删(现已不被过夜流程调用)
- 已起独立server离线验证(stub AI/图):邀请三选项→跟他走→第一幕两选项→继续→第二幕(nights0→1,好感80→86,_stayedOver置位,"夜还很长"按钮)/离开→"回家"→夜幕转场,全程零报错。用 `otrTestStay(npc)` 面板即可复测
**v10.86（用户反馈:过夜第一幕图有人 + 文案都不好/第二幕要更露骨）**：
- **分幕背景生成人物修复**：flux对"沙发上啤酒/餐桌两杯茶"这类构图会自动画人(过夜场景本不该出现人物,一致性靠立绘)。`OVERNIGHT_ACT1`/`ACT2` 重构为对象(img生图/scene文案/prop动作)，img改成**道具静物特写+强调空房unoccupied**(如"still-life close view...empty worn couch in background...unoccupied")，`genNPCHomeActBg` 负向词加强(no man/woman/figure on couch/bed/chair)。降低概率,flux仍无法100%,旧图 `otrClearBg()` 重刷
- **过夜文案重写为言情/情色小说笔法**：原prompt产出被用户评"都不好"。act1Ctx→"WRITE LIKE A BESTSELLING ROMANCE NOVEL"(lush/sensory/emotionally immersive,3-4句变节奏,停在吻前的对视);act2Ctx→"HOTTEST SCENE IN A BESTSELLING EROTIC ROMANCE"(**按用户要求更露骨**:吻深入/衣物褪去/唇与手描摹肌肤/欲望与热度的感官细节,4-6句,但保持言情的意象化register非解剖式,在最高潮处艺术性fade to black)。两版中英fallback也重写得更好
- ⚠️尺度:走"steamy言情+高潮淡出",非硬核。若claude-sonnet对更露骨请求部分软化/拒绝需再调;且上架App Store有分级/内容政策风险(用户自行权衡)
- 已离线验证(stub AI/图):两幕流程零报错、img prompt以静物空房开头、文案prompt含romance/erotic指令、scene字段正确注入

**v10.87（过夜文案再修:独立散文生成 + 设置页版本号）**：用户"文案还是不好"
- **根因**：过夜两幕文案调 `buildDialoguePrompt`(对话框架:"你就是这个NPC用他口吻说话/完全保持角色"),却塞"写第二人称叙述",模型被"扮角色说话"vs"写小说"撕扯→产出别扭。且没用 `claude()` 的 `sys` 系统提示、无范例
- **改法**：新增 `genOvernightProse(npcKey,act,firstNight)` 绕开对话框架——①强系统提示(把模型设成"award-winning成人言情小说家",给成人内容许可+register)②干净场景指令(NPC名/性格style/场景/道具/该幕热度)③**few-shot范例** `_overnightExemplar(act)`(中英各一段高质量steamy范例,拉品质,让模型对齐而非发挥)。第二幕仍erotic romance尺度、高潮fade。邀请台词仍走buildDialoguePrompt(那本就是口语,正确)
- **设置页加版本号**：底部 `#ver-tag-settings`「Off the Record · v10.87」,点它也触发 `devTap()`(=连点5下开DEV面板,现在游戏中/设置页都能开)。标题页版本号保留
- 已离线验证:两幕都走genOvernightProse(sys含novelist、user含范例、act2含erotic指令)、邀请仍走对话框架、设置版本号显示、零报错
- ⚠️若claude-sonnet对露骨仍软化:范例已是明确尺度锚,应有帮助;真不行需再提尺度或考虑作者手写兜底

**v10.88（用户要:关生图省钱测剧情）**：运行时生图开关
- `img()` 开头加 `|| G.imgOff` 短路返回null（不请求生图,已缓存的图不受影响）。原 `DEV_MODE_IMG` 常量保留
- **设置页**新增「IMAGE GENERATION 图片生成」段(On开/Off关,`setImgOff`,存档持久化,`openSettings`回显选中态)
- **DEV面板**加快捷按钮 `devToggleImg()`(标签实时反映当前开/关)
- 已验证:imgOff=true时img()返回null、设置卡选中态、DEV标签翻转、设置页截图含新段+版本号v10.88、零报错

**v10.89（用户战略反馈·②带动作互动对话的根本重构:目的+潜台词驱动）**：
- **病根**（用户抱怨"动作莫名其妙,不懂NPC为什么这么做/说"）：对话系统只给了"聊什么话题"(topic seed)+"在哪做什么动作"(从`dateActionHint`地点表随机抓),但**没给"他这场想要什么"(目的)和"他真正在干嘛/藏什么"(潜台词)**。动作和他是谁/此刻动机脱节→飘、无动机。戏剧=目的+阻碍+潜台词
- **根本修法**：新增 `DATE_INTENTS`(5NPC×3好感档low/mid/high的want+sub)+`sceneIntent(npc,rel)`(按好感取档)+`intentBlock()`(拼成"SCENE INTENT:每句台词每个动作都为此目的服务、透出潜台词、不许无动机、他从不明说目的")+`intentActionRule()`(动作从"他此刻想要什么+他是谁"长出来、透意图、地点表只作场地灵感,不再随机手势)
- **接入**：约会 `playInviteScene` 和见面 meetup 两条对话路径的 rounds 都换成 intentBlock+intentActionRule;三轮结构改成"开场已在暗中追求目的→深入让潜台词透出→收尾把目的落下让她回味",topic seed 降级为"有用就用"的表层素材
- 举例(鼓手):好感低=试探她是否真把音乐当回事(毒舌是测试)、中=不明说在乎却想让她看到他的真实世界、高=想跨过那道他假装不存在的距离。这样玩家能看懂"他为什么这么做"
- 已验证:三档want各不同、intentBlock含SCENE INTENT+subtext、action规则含"ARISES from what he wants"、零报错
- ⚠️纯prompt层重构,效果要用真AI跑约会/见面看。用户在找②之外③(过夜撩人)的"好文案样本"发来做范例锚

**v10.90（③过夜撩人文案:按参考书校准每个NPC语感 + 尺度可调等级B）**：用户提供5本书当范例锚,选定尺度B(上架安全)
- **尺度等级常量** `HEAT_LEVEL`（顶部,和DEV并列）：A含蓄淡出 / **B更热但高潮淡出、不写露骨(上架App Store/Google安全,默认)** / C露骨(仅网页成人版勿上架)。改一个常量整体切换;将来做成人网页版只需改成C
- **每NPC亲密语感按用户选定的书校准**（重写 `OVERNIGHT_STYLE`,只学register不抄原文）：经纪人←Bared to You(占有欲/"什么都知道你"/直白而笃定)、鼓手←Fifty Shades(控制/粗粝支配/命令式少话)、男演员←Book Lovers(机锋斗嘴/调情如表演,机锋里漏真心)、管家←Beach Read(情绪价值/温暖脆弱/半告白,配合他被动女主主动)、侦探←Love Hypothesis(绿旗/极度尊重/等她yes/克制体贴)
- **genOvernightProse 第二幕**：把原来写死的"更露骨+fade"换成 `CEIL[HEAT_LEVEL]` 驱动的尺度天花板(B=深吻/衣物褪去/唇手在肌肤但不写露骨行为、高潮fade to black),并强调"占有/命令/玩味/害羞/尊重五种人此刻必须读起来完全不同"。第一幕仍是吻前停(不受尺度影响)
- 已验证:HEAT_LEVEL=B、5语感就位、act2 prompt含B天花板+fade+禁露骨+语感、零报错
- 参考书原文只用于学手法(读取分析),范例全原创,不入库不照抄
- ⚠️效果需开真AI跑过夜看。上架尺度封顶B;要真露骨只能放弃两大商店走网页(已跟用户讲明)

**v10.91（用户50+条实测反馈·Fix批A:对话/散文正确性 + 语气镜头输入 + AFFINITY_PACE）**：反馈已归类为R1-R11根因(见对话记录),本批修 R2/R3/R5/R6/R8/R9/R10/R11 + D2
- **AFFINITY_PACE**（index.html顶部,默认1.0=无变化）：好感涨速全局倍率,state.js change() 乘入(×0.6×pace)。等用户收集真人数据后拧
- **R2 结尾旁白按好感分档**（runVNDialog 收尾）：见面/约会结束旁白改3档池随机(低=普通道别/中=暖/高≥70才许"余温"式暧昧),修"朋友期也'余温留在指尖'"；录音室收尾句改暖(原"你推开门走进走廊"像摔门)
- **R3 收尾轮必须收场**：date/meetup 最后一轮 prompt 加"FINAL beat,禁止'现在带你去某地'/开新计划(场景马上结束,空头'走吧'读起来像bug)"；intentActionRule 加 FACT RULE(禁编造不在记忆里的演出/歌/共同经历)
- **R5 过夜去重复**：①鼓手ACT1改性格贴合(进门就拉近再强停,不再"先放唱片") ②genOvernightProse 第一夜/非第一夜分叉:非第一夜=短2-3句/老情侣熟稔/无招待仪式/明确"不能读起来像初夜" ③第≥2夜ACT2随机换地点(餐桌/阳台/书房/厨房台面/玄关) ④sys加HARD BANS:"别动"/推杯子/撩头发/"余温" ⑤邀请借口多样化(禁"再喝一杯"默认,要个人化+不重复) ⑥过夜后夜幕旁白5句池随机
- **R6 晨后消息**：prompt改"她已回自己家"位置自洽+单条+禁舞台提示/星号/时间戳/洗床单;同步 `G._morningAfterMark` 让常规早晨批次跳过该NPC(修两条消息互相矛盾)
- **R8 人称**：intentActionRule+过夜sys 强制 女主=你/绝不"她"
- **R9+D2 语气镜头**（runVNDialog动态轮）：**砍掉AI生成3整句选项**(修"很高兴遇到你"不合场景+省每轮1次AI调用+保住自由输入独特性)。默认只有输入框;点"💡需要点灵感?"展开3语气(调侃他/认真回应/转移话题,4语言);点语气往输入框填**悬着的半句**(每语气3个开头随机,可续写可直发),`_vnLastTone` 随下轮带给AI帮它读懂半句意图。剧本轮(playerOptions)保留手写选项
- **R10 周榜**：发榜时写入agent记忆"榜单一周一更,今天做什么都不改数字,别暗示会变"
- **R11**：晨间消息prompt禁把时间戳念出来("七点十四。"开头);story.js管家arc1改"首遇时已道贺过,别再提签约";演员Day3context加"歌是她的,说'你那首'禁'我那首',禁编歌名"
- 已验证:pace=1.0行为不变(50+10→56)、语气镜头渲染/填半句/tone记录、每轮1次AI调用、零报错
- **未修留待批B**：R4(邀约/日历:自动确认/重复约/日期错位/爽约无反应/上午吞下午/图5乱)、R7(女主家场景/短信约触发过夜/送到楼下式过夜)、R1(名字性别校验)。功能批:生日/emoji/草稿保留/过夜勋章/售楼处/换装反馈/蛋糕图/过夜邀请音效/演员开衫鼓手纹身发色/美容院重生成

**v10.92（Fix批B:邀约/日历系统R4 + 女主家场景R7 + 名字性别校验R1）**：
- **R4 聊天立约改"待确认"**（futureInvite handler）：不再直接 status accepted（修"日历替我确认了没让我点"+双约撞车），玩家在日历点接受才算数；prompt 加"只有她明确同意才填futureInvite,你提议她没答就都别填"+"daysFromNow必须按DATE REFERENCE表精确落在你说出口的那天(明晚=1)"。同NPC同日已有邀约→合并更新不堆条目；`addNPCInvite` 同样去重（修图5一个计划两条）。futureInvite 新增 locationKey 落进 `inv.locKey`（修"约喝汤去了湖边"——之前聊天立约根本不带地点）
- **R4 爽约有反应**：新增 `sendStoodUpMessage(npc,title)`——被放鸽子的NPC当晚发消息(受伤/冷淡/装不在乎按性格)；接入白天爽约+晚间选择放弃的两处
- **R4 上午工作不吞下午约会**（goEvening开头）：入夜前发现当天还有已确认未赴的白天约→先 `playInviteScene` 赴约再入夜（`G._dayInvGuard` 防重入；playInviteScene会标completed）。图3"选了词曲创作课就直接入夜"修复
- **R7 女主家/NPC家成为正式场景**：新增 `resolveSceneBg`(her_home=公寓已有图零生图成本;*_home=genNPCHomeBg;其余genLocationBg)+`homeLocDesc`；聊天 meet/futureInvite locationKey 加 `her_home|his_home`；runMeetupScene/playInviteScene 都支持（开场白单独写"门铃响了他来了你家"，修"你们约在了上门找她"读不通+咖啡馆兜底错景）；DATE_ACTION_HINTS 加两个家场景；标题规则禁"深夜即兴见面"式元描述+禁带她名字（修"陪Ting逛街"）
- **R7 见面也能过夜**：runMeetupScene 晚间+好感≥75 挂 maybeStayOver（修"信息约见面不触发过夜"）
- **R7 过夜四模式**（maybeStayOver重构 dest=at_his/at_hers/go_his/walk_hers）：公共地点50%"跟他走(他家)"/50%"**送她回家他找借口上来**"(新,用户点子);她家场景="让他留下";选项/邀请词/婉拒词/记忆/两幕背景(她家=客厅→卧室图,零生图)/散文场景(genOvernightProse加atHers参数,她家版第一幕/第二幕/换地点列表)/晨后消息(_stayedOver.at区分"她溜回家"vs"他离开她家")全按模式走
- **R1 名字**：两处NPC名字生成加 MALE/masculine 强制+排除已用名(修Margaret Holloway女名);`claude()` 全局 CAST GUARD:五男主全男性+配角起名禁复用主角团名字(修制作人叫成演员名)
- 已验证:her_home全流程(邀请→让他留下→两幕bg=她家图→stayedAt=hers→散文ctx带her)、公共地点两模式4/4随机、goEvening改道到白天约、addNPCInvite去重+pending、零报错
- 测试:`otrTestStay('agent','her_home')` 可直接测她家过夜;公共locKey测随机两模式

**v10.93（功能批:生日/emoji/草稿/过夜勋章/售楼处/换装反馈/蛋糕图/过夜音效/外形/美容院）**：一次上10个功能
- **生日系统**：设置页新增"MY BIRTHDAY 🎂"月/日选择(`setBirthday`→G.player.birthMonth/Day)；startDay 里生日当天(月日匹配,`G._bdayCelebrated`防重)：日历🎂事件 + 好感前3的NPC按性格发祝福 + **名气<40=好感最高NPC约今晚生日晚餐**(走正常邀约流程) / **名气≥40=歌迷庆生活动**(经纪人消息+新闻卡)
- **聊天emoji**：输入栏😊按钮展开24个表情行(`toggleChatEmoji`),点表情追加输入框
- **聊天草稿保留**：`G._chatDraft[npc]` oninput即存、openChat回显、发送后清（修"切去日历回来输入丢了"）
- **过夜勋章**：好感页名字后隐晦🌙(nights>0;≥3加⋆),不写字懂的自然懂
- **售楼处**：名气≥50且未换房→休闲选项出现"🏙️售楼处看房"(`REALTY_STYLES`3选:云端顶层/河景大平层/花园洋房)→生成客厅日/夜+卧室夜3张图替换公寓、`apartment.upgraded`、全体已识NPC记忆"她搬新家了"
- **换装反馈**：发廊换发型/商场新衣/美容院焕新→`G._lookChange{day,desc,seen}`；约会/见面第一轮注入 `lookChangeNote(npc)`(3天内且该NPC没见过→"注意到她的新造型并按性格回应一次")
- **美容院焕新形象照**（playFree加beauty_salon分支→`renderBeautyOpts`）：发型/发色/族裔全保持(buildProtagonistPrompt本来就带),**新seed**重生成一张,旧vs新二选一,选新则portraitUrl+portraitSeed都换+进相册+触发换装反馈
- **过夜邀请专属音效**：playSound新增`stay-invite`(G4→E4→C4缓慢下行暧昧双音),maybeStayOver邀请台词出现时播放
- **外形**：演员=crisp shirt top buttons undone露锁骨(更性感,用户要求);鼓手=手臂纹身;**NPC选形象加发色第二步**(种族确认后同弹层切换到6色:保持本色/乌黑/深棕/栗棕/金发/雾灰,存`npc.hairColor`),state.js新增`applyHair()`把外形表hair串的颜色词换成所选色,5个build*Prompt全接入
- **蛋糕出图**：Day30管家蛋糕卡片异步生成实图(点开放大,进相册),失败保留🍰
- 已验证:emoji24个/草稿存取/🌙渲染/applyHair("golden blonde swept back")/演员衬衫+鼓手纹身入prompt/售楼处按名气门槛显隐/lookChangeNote每NPC一次/设置生日存取/**两步发色流程**(族裔→发色→回调,drummerHair=golden blonde)/**生日全触发**(日历+agent晚餐邀约+2条祝福)/零报错
- 注:发色只对**未锁定立绘**的NPC生效(立绘已锁的照旧,重生成才变)

**v10.94（Batch2:过夜后关系动态——公开/低调 + 朋友聚会 + 吃醋冷战）**：
- **立场消息**（第一夜次日,`_stanceDue`）：按性格 `REL_STANCE`——**鼓手=想公开**(邀你去他朋友聚会,2天后 livehouse 待确认邀约,`gathering:true`) / 经纪人=求低调(利益冲突) / 演员=先低调(花名在外) / 管家=想私密(藏秘密) / 侦探=绝对低调。startDay 里调度发消息+建聚会邀约
- **朋友聚会=公开**（playInviteScene `inv.gathering` 分支）：三轮=进门介绍为"我的女人"→融入笑闹(可带一句朋友反应,只用"贝斯手"等角色不点名)→角落真心话；结束钩子记进**所有已识NPC记忆**(公开对象=正式在一起/其他人=听说她公开了)、`G.publicWith`、公开对象+8好感、置 `_publicReactDue`
- **公开后其他高好感(≥60)NPC反应**（次日,`PUBLIC_REACTIONS`）：经纪人/管家=**追问要解释**(受伤但克制/温柔破碎) / 演员/鼓手=**生气冷战**(一句刺人短语后`coldUntil`=当天+4~5天不回消息) / 侦探=一句冷评。均扣好感(×0.6生效)
- **冷战屏蔽**（`npcIsCold` = coldUntil>今天）：冷战期间玩家发消息**石沉大海**(sendChatReply 直接return)、NPC也不主动发早晨/晚间消息(两个senders过滤加 npcIsCold)
- **冷战解冻**（`THAW_CTX`，冷够天数后）：演员=装作无事发生(表演略裂)、鼓手=生硬的橄榄枝；发一条破冰消息,`coldUntil`清空
- 已验证:鼓手立场→建聚会邀约/经纪人求低调、公开反应扣好感(agent80→75)+演员进冷战+公开对象不反应、冷战期玩家发1条NPC0回复、解冻发破冰消息且解除冷战、零报错
- 测试:`otrTestStay('drummer')` 过夜→次日鼓手发聚会邀约;日历接受赴约=公开→次日看其他NPC反应

### 已全部清完的批次（用户两轮50+反馈 + 功能）
Fix批A(v10.91对话/散文正确性)、Fix批B(v10.92邀约日历/女主家/名字)、功能批(v10.93生日/emoji/草稿/勋章/售楼处/换装反馈/美容院/音效/外形/蛋糕)、Batch2(v10.94过夜后关系动态)

### 仍待开发（大件）
- **NPC出场节奏重排 + 4个全新恋爱向NPC**（用户已定"我提议4位全新",演员/管家→第2周、侦探→专辑发布名气小高潮、第3/4周各+2位）——需先出4位NPC方案给用户选
- **年末签约到期大分支**（自立门户/油腻老男人抢签/续约三选→自己开公司→招男员工=新NPC）(公开/低调+朋友聚会+吃醋不回消息,公开低调按性格:鼓手公开/经纪人低调/演员先低调后公开/管家私密/侦探绝对低调) ③美容院(做美容图+按特征重生成女主头像)+选NPC加发色 ④NPC出场节奏重排(演员+管家→第2周、侦探→专辑发布名气小高潮、第3/4周各+2位**全新恋爱向NPC**由我提方案) 

## 9. 待开发（优先顺序）

### 立即
- [ ] 第 2 章主线剧情（Day 31-60），同步加入：咖啡师、健身教练、录音室工程师

### 第 2-3 章完成后
- [ ] 第 3-4 章主线，同步加入：便利店员、宠物店/遛狗邻居支线、楼上大叔

### 主线骨架完成后
- [ ] 第 5-12 章剧情
- [ ] 各 NPC 平行感情线触发逻辑（见 `npc_storylines.md`）
- [ ] 各 NPC 结局分支（第 11-12 章）
- [ ] 侦探 Day 40 正式出场场景
- [ ] 存档/读档 UI 完善
- [ ] 街头摄影师、晨跑者等第三批二线 NPC
- [ ] Capacitor 打包上架 App Store / Google Play

### 待定
- [ ] 华裔族裔选项

---

## 10. 开发约定

1. **每次 commit 同步更新版本号（三处）**：见上方"⚠️新会话先检查"下方 §2 的三处清单（标题页/DEV MODE/两个script标签的`?v=`参数），漏第3处最容易导致"明明修好了用户还说没修"
2. API Key 只存 Cloudflare Worker 环境变量，不放代码里
3. Claude 对话用 `claude-sonnet-4-6`，图片用 `fal-ai/flux/schnell`，不换
4. 测试时说【关图】关闭图片生成
5. 向用户申请工具权限时用**中文**说明
6. 设计文档更新后，同步更新本文件和 `D:\...\memory\project_otr.md`
7. **push 前先跑一遍 `/code-review`**（用户明确要求的习惯），尤其是新加功能/大改动之后；light级别的修复也建议做完整多天连续游玩测试（不只是单点验证）——2026-07 那次修复经历证明，"设计上留的占位符/硬编码上限"这类问题（如`nextDay()`里"玩到Day5就弹窗卡死"的占位逻辑）code-review的正确性角度抓不到，只有实际跑通多天流程才会暴露
8. **不要假设本地=线上**：每次会话开始检查 `git log --oneline origin/main..HEAD`，本地经常会攒好几个未推送的commit
