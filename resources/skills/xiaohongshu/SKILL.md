---
name: xiaohongshu
description: "小红书助手 (Xiaohongshu / RED): create, optimize, and publish content for the Xiaohongshu (小红书/RED) platform. Write engaging posts with trending hashtags, optimize titles for discovery, generate content in the authentic 小红书 style, and manage account interactions. Use when: the user wants to write a 小红书 post, create Xiaohongshu content, find trending hashtags, optimize a note for discovery, draft a product review or lifestyle post, or manage their 小红书 account."
metadata: { "openclaw": { "emoji": "🍠" } }
---

## Setup
```bash
npx xiaohongshu-mcp
# Scan QR code with 小红书 app to authenticate
```

## Content Creation Workflow

### 1. Understand the Brief
Ask user:
- Topic / product / experience to share
- Target audience (age, interests, lifestyle)
- Tone (authentic personal story / professional review / tutorial)
- Any specific keywords to include

### 2. 小红书 Title Formula
The title is crucial — follow these high-engagement patterns:
- **Question hook**: "为什么我越用越瘦？秘密是这个！"
- **Number list**: "打工人必备！5个让效率翻倍的工具"
- **Contrast**: "同款产品花了10倍价格，竟然不如这个平替"
- **Emotion**: "第一次尝试居然成功了！手把手教你..."
- Keep title under 20 characters for mobile display
- Include 1-2 core keywords naturally

### 3. Post Body Structure
```
[开头钩子 - 前2行决定展开率]
引发共鸣的问题 / 强烈的结果 / 惊喜的发现

[正文干货]
✅ 要点1：...
✅ 要点2：...  
✅ 要点3：...

[细节展开]
具体操作/使用感受/对比分析

[结尾互动]
"你们有没有试过？评论区告诉我！"
"觉得有用的话记得点赞收藏哦～"
```

### 4. Hashtag Strategy
- 3-8 hashtags per post
- Mix: broad category + specific niche + trending topic
- Format: #话题名称
- Find trending tags in the user's category

```
#好物推荐 #生活方式 #<具体品类> #<产品名> #<使用场景>
```

### 5. Platform-Specific Style Tips
- Write in first person, conversational tone
- Use line breaks liberally (mobile readers)
- Include emoji to break up text: ✅ 💡 🌟 👇
- Authentic > polished (raw real photos outperform studio shots)
- Share failures/struggles, not just successes
- End with a question to drive comments

### 6. Content Categories & Best Practices

| Category | Key Elements |
|---|---|
| 美妆护肤 | Before/after, exact product names, skin type |
| 美食探店 | Location tag, price, must-order dishes |
| 穿搭分享 | Item links, body measurements, outfit breakdown |
| 旅行攻略 | Day-by-day itinerary, cost breakdown, tips |
| 职场干货 | Actionable steps, personal experience, templates |
| 健身减脂 | Specific data (kg, reps, duration), progress pics |

## Publishing (via MCP)
```bash
# Draft and publish a note
xiaohongshu-mcp publish --title "<title>" --content "<body>" --tags "#tag1 #tag2"

# Schedule for optimal time (Mon-Fri 12:00-14:00 or 20:00-22:00)
xiaohongshu-mcp schedule --time "20:00" --title "<title>" --content "<body>"
```
