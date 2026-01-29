/**
 * 后端服务器入口文件
 * 提供API接口用于租房匹配
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { matchApartments } from './services/matchingService.js';
import { loadApartments } from './utils/dataLoader.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 加载公寓数据
let apartmentsData = [];
loadApartments().then(data => {
  apartmentsData = data;
  console.log(`✅ 已加载 ${apartmentsData.length} 条公寓数据`);
}).catch(err => {
  console.error('❌ 加载公寓数据失败:', err);
  console.log('💡 提示：请先运行导入脚本将Excel数据转换为JSON');
});

/**
 * 健康检查接口
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '服务运行正常',
    apartmentsCount: apartmentsData.length 
  });
});

/**
 * 租房匹配接口
 * POST /api/match
 * Body: { workAddress: string, commuteTime: number, budget: number }
 */
app.post('/api/match', async (req, res) => {
  try {
    const { workAddress, commuteTime, budget } = req.body;

    // 参数验证
    if (!workAddress || !commuteTime || !budget) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数：workAddress（上班地址）、commuteTime（通勤时长，分钟）、budget（预算，元）'
      });
    }

    if (apartmentsData.length === 0) {
      return res.status(500).json({
        success: false,
        message: '公寓数据未加载，请先运行导入脚本导入数据'
      });
    }

    console.log(`🔍 开始匹配：上班地址=${workAddress}, 通勤时长≤${commuteTime}分钟, 预算≤${budget}元`);

    // 执行匹配
    const results = await matchApartments({
      workAddress,
      commuteTime: parseInt(commuteTime),
      budget: parseInt(budget),
      apartments: apartmentsData
    });

    console.log(`✅ 匹配完成，找到 ${results.length} 个符合条件的公寓`);

    res.json({
      success: true,
      data: results,
      total: results.length
    });

  } catch (error) {
    console.error('❌ 匹配失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '匹配过程中发生错误'
    });
  }
});

/**
 * 获取所有公寓列表（用于测试）
 */
app.get('/api/apartments', (req, res) => {
  res.json({
    success: true,
    data: apartmentsData,
    total: apartmentsData.length
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`🔍 匹配接口: POST http://localhost:${PORT}/api/match`);
});
