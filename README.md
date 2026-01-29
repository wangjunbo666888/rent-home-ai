# 租房匹配系统 (Rent Home AI)

基于腾讯地图API的智能租房匹配系统，帮助租客根据上班地点、通勤时长和预算匹配合适的公寓。

## 项目结构

```
rent-home-ai/
├── frontend/        # 前端项目（React + Vite）
│   ├── src/
│   │   ├── App.jsx              # 主应用组件
│   │   └── components/          # 组件
│   │       ├── SearchForm.jsx   # 搜索表单
│   │       ├── ResultsList.jsx  # 结果列表
│   │       └── MapView.jsx      # 地图视图
│   └── package.json
├── backend/          # 后端项目（Node.js + Express）
│   ├── src/
│   │   ├── server.js              # 服务器入口
│   │   ├── services/              # 业务逻辑
│   │   │   └── matchingService.js # 匹配服务
│   │   └── utils/                 # 工具函数
│   │       ├── tencentMapApi.js   # 腾讯地图API
│   │       └── dataLoader.js       # 数据加载
│   ├── .env                        # 环境变量（包含API密钥）
│   └── package.json
├── data/            # 公寓数据存储
│   ├── apartments.xlsx            # Excel原始数据
│   └── apartments.json             # 转换后的JSON数据
└── scripts/         # 工具脚本
    └── import-excel.js             # Excel导入脚本
```

## 快速开始

### 1. 安装后端依赖

```bash
cd backend
npm install
```

### 2. 导入公寓数据

将Excel文件放到 `data/` 目录，然后运行导入脚本：

```bash
cd scripts
npm install
node import-excel.js
```

这会读取 `data/apartments.xlsx` 并转换为 `data/apartments.json`。

### 3. 配置API密钥

在 `backend/.env` 文件中已经配置了腾讯地图API密钥（如果还没有，请创建该文件并添加）：

```
TENCENT_MAP_KEY=你的API密钥
PORT=3001
```

### 4. 启动项目

**启动后端服务：**
```bash
cd backend
npm run dev
```
后端服务运行在 http://localhost:3001

**启动前端服务：**
```bash
cd frontend
npm install  # 如果还没安装依赖
npm run dev
```
前端服务运行在 http://localhost:5173

**访问系统：**
打开浏览器访问 http://localhost:5173 即可使用租房匹配系统

### 5. 测试接口

**健康检查：**
```bash
curl http://localhost:3001/api/health
```

**匹配接口（示例）：**
```bash
curl -X POST http://localhost:3001/api/match \
  -H "Content-Type: application/json" \
  -d '{
    "workAddress": "北京市朝阳区建国门外大街1号",
    "commuteTime": 60,
    "budget": 3000
  }'
```

## API接口说明

### POST /api/match

租房匹配接口

**请求体：**
```json
{
  "workAddress": "上班地址（完整地址）",
  "commuteTime": 60,  // 最大通勤时长（分钟）
  "budget": 3000      // 预算（元）
}
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": "APT0001",
      "name": "公寓名称",
      "minPrice": 2500,
      "maxPrice": 3500,
      "address": "详细地址",
      "district": "朝阳区",
      "remarks": "备注信息",
      "commuteTime": 35,
      "commuteDistance": 8500,
      "commuteRoute": "地铁1号线（5站） → 公交123路（3站）",
      "recommendation": "通勤时间仅35分钟，非常便利；价格2500元起，在预算范围内；距离约8.5公里"
    }
  ],
  "total": 1
}
```

## 功能特性

### 后端功能
- 🗺️ 基于腾讯地图API的通勤时间计算
- 💰 根据预算智能筛选公寓（使用最低月租金）
- ⏱️ 通勤时长匹配
- 📊 结果展示与推荐理由说明
- 🔄 自动排序（通勤时间优先，价格次之）
- 💾 API调用缓存机制（减少重复调用）

### 前端功能
- 📝 友好的输入表单（上班地址、通勤时长、预算）
- 📋 清晰的结果列表展示（价格、通勤时间、地址等）
- 🗺️ 地图可视化（标记上班地点和推荐公寓）
- 💡 智能推荐理由说明
- 🎨 现代化的UI设计

## 注意事项

1. **API调用频率**：代码中已添加200ms延迟，避免调用过快
2. **数据格式**：Excel文件需要包含以下列：公寓ID、公寓名称、最低月租金、最高月租金、详细地址、备注
3. **地址格式**：建议使用完整地址，包含"北京市"前缀，以提高地理编码准确性
# rent-home-ai
