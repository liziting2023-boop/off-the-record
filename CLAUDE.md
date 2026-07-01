# Off the Record · Claude Code 开发手册

> 每次开新 Claude Code 会话时自动加载。包含项目全貌、当前状态和开发约定。

---

## 1. 项目基本信息

| 项目 | 说明 |
|------|------|
| 游戏名 | Off the Record |
| 类型 | AI 驱动乙女游戏（视觉小说） |
| 目标用户 | 非中国市场女性，30-50 岁，欧美/东南亚 |
| 当前版本 | **v10.40** |
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

### 每次 commit 必须同步更新版本号（两处）
- `index.html` 约第 349 行：`<p ...>v10.XX</p>`
- `index.html` 约第 2709 行：`v.innerHTML = 'v10.XX · ...'`

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
