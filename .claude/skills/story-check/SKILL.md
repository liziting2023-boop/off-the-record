---
name: story-check
description: 检查 Off the Record 的剧情文本与生成 prompt 的逻辑一致性——时间线矛盾、人称指代错误、日程与消息内容不符、NPC人设与对话/生图不符、AI编造未发生事件的风险点。改动 story.js、消息/对话生成 prompt、或新增章节剧情后运行。
---

# 剧情一致性检查（story-check）

对 D:\OTR\repo 的 story.js、state.js、index.html（消息/对话/旁白生成 prompt）做剧情逻辑审查。
输出发现的问题清单：文件:行号 + 问题描述 + 建议修复。只报有具体证据的问题，不报风格意见。

## 背景设定（判断依据）

- 游戏从 2027年3月1日（周一）开始，Day 1 = 签约后第一天；女主已在城市住约2个月（街头卖唱）。
- Day 1-5 剧情固定：1经纪人办公室 / 2录音室见鼓手 / 3杂志拍摄 / 4回公寓遇管家 / 5和经纪人喝咖啡。侦探 Day 40 才正式出场。
- 周末（周六/日）不安排工作。经纪人首月计划：每周3-4个工作日，写在日历 source:'agent_mandate'。
- 隐藏剧情：管家是经纪人同父异母弟弟，Day 210 揭露——之前任何文本不得提前泄露。
- 对话中 NPC 不得说出其他 NPC 的真名，只能用角色称呼（band leader / the actor / building manager / the detective）。
- 人设：经纪人=亲和专业有温度；鼓手=毒舌高标准直接；演员=见漂亮女生就撩、坏笑；管家=表面乖巧温暖（暗地城府深）；侦探=冷静克制。

## 检查清单

1. **时间线**：
   - 剧本/prompt 里"昨天/明天/上周"类引用与实际天数是否成立（Day 1 没有"昨天的合作"）。
   - scriptedEvents 各天的 npcContext 是否引用了当天还没发生的事件或还没登场的 NPC。
   - 生日/节日日期（story.js specialDates）与起始日期 2027-03-01 推算是否一致。
2. **人称与指代**：
   - NPC 台词 prompt 是否强制"引号外动作用第三人称"（防"我没有回头。「我知道。」"）。
   - 是否用 你/you 称呼玩家（不能出现 她/she 指玩家）。
   - 是否可能说出其他 NPC 真名。
3. **AI 编造防护（grounding）**：逐个检查这些生成点的 prompt 是否包含：只能引用记忆列表事件、不得编造试镜/导演/平台、不得声称玩家发过未发过的消息、日程回答必须来自 buildScheduleContext：
   - generatePhoneContent（早晨消息）
   - goEvening（晚间经纪人消息/质问）
   - generateAffinityMessages（好感消息+邀约JSON）
   - sendChatReply（聊天回复JSON）
   - runVNDialog / closing（场景对话）
   - startDay / playFree / playScheduledEvent（旁白）
4. **日程一致性**：
   - 消息里提到的排练/课程/见面，是否强制走结构化 JSON 写入日历（event/invite 字段），daysFromNow 与文字所说时间一致。
   - 必须行程、NPC安排、邀约三类事件是否会互相挤占（同天冲突检查）。
   - 周末是否可能被排进工作（isGameWeekend 检查点）。
5. **人设一致**：
   - 各 NPC 的 corePersonality / emotionalArc / 生图 expression 三者是否同向（如经纪人文本亲和但生图 prompt 仍写 cold/stern 就是矛盾）。
   - 好感度加分方向（经纪人=自信、鼓手=强势、演员=冷淡、管家=温柔、侦探=理性）与 npcPersonalityBonus 数值是否一致。
6. **泄密检查**：Day 210 前的任何 preText/npcContext/消息 prompt 是否可能泄露管家-经纪人兄弟关系或侦探受雇一事。

## 运行方式

按清单逐项 Grep/Read 相关代码段核对，最后按严重度输出：
- 🔴 剧情阻断/明显矛盾（玩家一定会看到）
- 🟡 特定条件下才会出现的矛盾
- 🔵 建议加固的 grounding 缺口
