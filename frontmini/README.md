# 智能租房匹配 - 微信小程序（frontmin）

与 **frontend** 功能一致，复用 **backend** 接口的微信小程序端。

## 功能

- **首页**：输入上班地址（带联想）、通勤时长、预算，提交后调用 `POST /api/match` 匹配
- **结果页**：展示匹配公寓列表 + 地图（上班地点与公寓点位）
- **媒体页**：查看公寓图片与视频，支持预览、保存图片到相册

## 后端接口（与 backend 一致）

- `POST /api/match` — 租房匹配（workAddress, commuteTime, budget）
- `GET /api/suggestion?keyword=xxx&region=北京市` — 上班地址联想

## 配置

1. **接口地址**：在 `config.js` 中修改 `baseUrl`。
   - 开发：本机可用 `http://localhost:3001`（需在微信开发者工具中勾选「不校验合法域名」）。
   - 真机/体验版：改为你的后端 **HTTPS** 域名（并在小程序后台配置 request 合法域名）。

2. **AppID**：在 `project.config.json` 中可将 `touristappid` 改为你的小程序 AppID。

## 运行

1. 用微信开发者工具打开 **frontmin** 目录。
2. 确保 **backend** 已启动（如 `npm run dev`，端口 3001）。
3. 开发者工具中若请求 localhost，请勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」。

## 目录结构

```
frontmin/
├── app.js
├── app.json
├── app.wxss
├── config.js           # 后端 baseUrl、区域等
├── project.config.json
├── sitemap.json
├── utils/
│   ├── api.js          # match、suggestion 封装
│   └── request.js      # wx.request 封装
├── pages/
│   ├── index/          # 首页（搜索）
│   ├── results/        # 结果（列表+地图）
│   └── media/          # 媒体（图片/视频）
└── README.md
```
