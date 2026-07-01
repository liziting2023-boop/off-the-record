# Off the Record · Claude Code 开发手册

> 每次开新 Claude Code 会话时自动加载。包含项目全貌、当前状态和开发约定。

---

## 1. 项目基本信息

| 项目 | 说明 |
|------|------|
| 游戏名 | Off the Record |
| 类型 | AI 驱动乙女游戏（视觉小说） |
| 目标用户 | 非中国市场女性，30-50 岁，欧美/东南亚 |
| 当前版本 | **v10.44** |
| Live 网址 | https://liziting2023-boop.github.io/off-the-record/ |
| GitHub 仓库 | liziting2023-boop/off-the-record |
| 本地仓库路径 | D:\OTR\repo |
| 设计文档路径 | D:\OTR\ |

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

---

## 4. 技术关键点

### API
- Claude 对话：`claude-sonnet-4-6`（**不换模型**）
- 图片生成：`fal-ai/flux/schnell`（**不换模型**）
- 代理：Cloudflare Worker `off-the-record-api.liziting2023.workers.dev`
  - `/claude` → Anthropic API
  - `/image` → fal.ai

### DEV MODE
- `DEV_MODE_IMG = false`（true = 跳过生图省钱）→ 说【关图】/【开图】切换
- `DEV_MODE_TXT = false`

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
- 可选城市：纽约、洛杉矶、伦敦、巴黎、东京、首尔、悉尼、纳什维尔
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

## 8. 已完成功能（截至 v10.40）

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
- **[v10.40]** 修复族裔生图准确性（加入五官特征描述）
- **[v10.40]** 修复相册自动存图 Bug（改为确认时才存）
- **[v10.40]** 修复对话框遮挡 NPC（调整遮罩渐变 + 选项高度上限）
- **[v10.40]** NPC 外形更新（身高、管家改便服）
- **[v10.41]** 修复 Day 1 卡住无法开始游戏的严重 Bug（`G.calendar.events` 从未初始化，导致 `startDay()` 在切换画面前就报错崩溃）
- **[v10.41]** 加固 `startDay()`：AI 文案请求失败时不再卡死，正常显示当日选项
- **[v10.41]** 修复日期显示（Mar 15）与日历内部日期（Mar 1）不一致的问题，统一为 3 月 1 日开局
- **[v10.42]** 女主族裔新增"北美"选项（金发碧眼、典型美式甜心风格）
- **[v10.42]** 男性 NPC 族裔选择池从 8 个扩充到 14 个（新增德国/西班牙/印度/俄罗斯/澳大利亚/墨西哥），每次选择随机抽取 8 个展示，不再每次都是同一批
- **[v10.42]** 发色新增"鲜紫色 Vivid purple"选项，并强化生图提示词对发色的约束权重
- **[v10.42]** 修复同一批候选图（女主/经纪人三选一）风格与发色不一致的问题：改为共用同一个生成 seed，风格描述前置到提示词最前
- **[v10.42]** 默认美术风格改为 Illustrated（Painterly Stylized），并修复设置页风格卡片默认选中状态与实际值不同步的问题
- **[v10.43]** **重要**：`story.js`/`state.js` 的 `<script>` 标签加上 `?v=10.XX` 版本号参数，防止浏览器缓存旧脚本导致已修复的 bug 在用户端"复现"（此前 v10.41 修的 Day1 卡死/日历打不开，用户仍能复现，根因就是浏览器缓存了旧 state.js）
- **[v10.43]** 修复签约初见场景（`s-agent-signing`）的对话框遮罩：该场景用内联 style 硬编码了旧版深色渐变，完全绕过了 v10.40 在 CSS class 里做的遮罩修复，导致挡脸问题在这个场景一直没修好。现已删除内联覆盖，统一走 `.vn-overlay` class
- **[v10.43]** 客厅三选一图片改为 3 套不同房间布局（此前只是同一布局换皮）：图1保留原布局，图2/图3新写了"小户型出租公寓、客厅餐厅一体、家具简单但软装温馨"的提示词（`LIVING_LAYOUT_B` / `LIVING_LAYOUT_C`），符合女主刚出道经济不宽裕的设定
- **[v10.44]** `.vn-dialog` 加 `max-height:50vh` + 内部滚动，3个对话选项时不再把NPC脸挤出屏幕
- **[v10.44]** 每日行动选项固定渲染3个槽位：剧情固定日显示1个真实选项+2个灰色虚线占位，不再是撑满整屏的巨大按钮；同时把主页房间缩略图从140px放大到220px
- **[v10.44]** 日历新增视觉样式：今天高亮、选中态、事件日下方加金色小圆点（此前`.cal-day`系列 class 完全没有CSS，日历格子是纯默认样式）
- **[v10.44]** 修复消息已读红点不消失：`openWCChat()`现在会把该NPC消息标记为已读并重新计算`phone-badge`未读数；聊天列表每条消息的"1"红点不再是写死的
- **[v10.44]** 夜晚房间图改为复用白天所选的具体布局文本（`G.apartment.selectedLayout`），只切换光照描述，不再是家具布局对不上的通用夜景提示词
- **[v10.44]** 剧情场景（`startScriptedScene`，即鼓手/男演员/管家/侦探的正式登场）生成头像后现在会存入 `G.gallery`，此前只有女主和经纪人的三选一头像会存回忆，其他NPC见面后回忆里没有照片
- **[v10.44]** "相册"统一改名"回忆"（`gallery_lbl`，中英文都改：Gallery→Memories）
- **[v10.44]** 修复手机模块系统性的白字配色 bug：`.wc-*` 一系列 class（状态栏、聊天列表姓名/预览/时间、朋友圈、行业资讯）都是为深色背景设计的白色文字，但 `.wc-phone` 实际背景是浅粉色 `#FFF5F7`，导致大量文字几乎不可见。统一改为深色文案
- **[v10.44]** 手机消息加上日期显示：消息对象加 `day` 字段，非当天消息在列表和聊天气泡里会显示具体日期（如"3月1日 19:30"），当天消息只显示时间

---

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

1. **每次 commit 同步更新版本号**（两处）
2. API Key 只存 Cloudflare Worker 环境变量，不放代码里
3. Claude 对话用 `claude-sonnet-4-6`，图片用 `fal-ai/flux/schnell`，不换
4. 测试时说【关图】关闭图片生成
5. 向用户申请工具权限时用**中文**说明
6. 设计文档更新后，同步更新本文件和 `D:\...\memory\project_otr.md`
