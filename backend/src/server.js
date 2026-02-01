/**
 * 后端服务器入口文件
 * 提供API接口用于租房匹配及管理端
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { matchApartments } from './services/matchingService.js';
import { loadApartments, saveApartments } from './utils/dataLoader.js';
import { getSuggestion } from './utils/tencentMapApi.js';
import { uploadToCos } from './utils/cosUpload.js';
import { BEIJING_DISTRICTS } from './constants/districts.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

/** 文件上传：内存存储，供 COS 上传使用 */
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

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

    // 执行匹配（返回 results 与 workLocation 供地图打点）
    const { results, workLocation } = await matchApartments({
      workAddress,
      commuteTime: parseInt(commuteTime),
      budget: parseInt(budget),
      apartments: apartmentsData
    });

    console.log(`✅ 匹配完成，找到 ${results.length} 个符合条件的公寓`);

    res.json({
      success: true,
      data: results,
      total: results.length,
      workLocation: workLocation || null
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
 * 上班地址输入提示（联想）
 * GET /api/suggestion?keyword=亮马河&region=北京市
 */
app.get('/api/suggestion', async (req, res) => {
  try {
    const keyword = req.query.keyword;
    const region = req.query.region || '北京市';
    if (!keyword || typeof keyword !== 'string') {
      return res.json({ success: true, data: [] });
    }
    const data = await getSuggestion(keyword, region);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ 输入提示失败:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || '输入提示请求失败',
      data: []
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

/** ---------- 管理端：公寓增删改查 ---------- */

/**
 * 重新从文件加载公寓数据到内存
 * @returns {Promise<Array>}
 */
async function reloadApartments() {
  const data = await loadApartments();
  apartmentsData.length = 0;
  apartmentsData.push(...data);
  return data;
}

/**
 * 根据现有列表生成新公寓 ID（APT0001 格式）
 * @param {Array} list
 * @returns {string}
 */
function nextApartmentId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^APT(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'APT' + String(max + 1).padStart(4, '0');
}

/**
 * 同一区域内公寓名称是否重复（排除指定 id，编辑时用）
 * @param {string} name - 公寓名称
 * @param {string} district - 区域
 * @param {string} [excludeId] - 排除的公寓 ID（编辑时传当前 id）
 * @returns {boolean}
 */
function isDuplicateName(name, district, excludeId) {
  const n = (name || '').trim();
  const d = (district || '').trim();
  if (!n || !d) return false;
  return apartmentsData.some(
    a => a.id !== excludeId && (a.district || '').trim() === d && (a.name || '').trim() === n
  );
}

/** 管理端 - 获取北京区域下拉列表 */
app.get('/api/admin/districts', (req, res) => {
  res.json({ success: true, data: BEIJING_DISTRICTS });
});

/** 管理端 - 检查同一区域内公寓名是否重复 */
app.post('/api/admin/apartments/check-name', (req, res) => {
  const { name, district, id: excludeId } = req.body || {};
  const duplicate = isDuplicateName(name, district, excludeId);
  res.json({ success: true, duplicate });
});

/** 管理端 - 上传文件到腾讯云 COS（图片或视频） */
app.post('/api/admin/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }
    const type = (req.body && req.body.type) || 'image'; // image | video
    const prefix = type === 'video' ? 'apartments/videos/' : 'apartments/images/';
    const { url } = await uploadToCos(req.file.buffer, req.file.originalname, prefix);
    res.json({ success: true, url });
  } catch (error) {
    console.error('❌ 上传失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/** 管理端 - 获取公寓列表 */
app.get('/api/admin/apartments', (req, res) => {
  res.json({
    success: true,
    data: apartmentsData,
    total: apartmentsData.length
  });
});

/** 管理端 - 获取单条公寓 */
app.get('/api/admin/apartments/:id', (req, res) => {
  const item = apartmentsData.find(a => a.id === req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: '公寓不存在' });
  }
  res.json({ success: true, data: item });
});

/** 管理端 - 新增公寓 */
app.post('/api/admin/apartments', async (req, res) => {
  try {
    const body = req.body || {};
    const minPrice = Number(body.minPrice);
    const maxPrice = Number(body.maxPrice);
    if (Number.isNaN(minPrice) || minPrice < 0 || Number.isNaN(maxPrice) || maxPrice < 0) {
      return res.status(400).json({ success: false, message: '月租请输入有效数字且不能为负数' });
    }
    if (minPrice > maxPrice) {
      return res.status(400).json({ success: false, message: '最低月租不能大于最高月租' });
    }
    if (isDuplicateName(body.name, body.district)) {
      return res.status(400).json({ success: false, message: '公寓名称重复，同一区域内不能重名' });
    }
    const id = body.id || nextApartmentId(apartmentsData);
    if (apartmentsData.some(a => a.id === id)) {
      return res.status(400).json({ success: false, message: 'ID 已存在' });
    }
    const newItem = {
      id,
      name: body.name ?? '',
      minPrice,
      maxPrice,
      address: body.address ?? '',
      district: body.district ?? '',
      remarks: body.remarks ?? '',
      images: Array.isArray(body.images) ? body.images : [],
      videos: Array.isArray(body.videos) ? body.videos : []
    };
    apartmentsData.push(newItem);
    await saveApartments(apartmentsData);
    await reloadApartments();
    res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('❌ 新增公寓失败:', error);
    res.status(500).json({ success: false, message: error.message || '新增失败' });
  }
});

/** 管理端 - 更新公寓 */
app.put('/api/admin/apartments/:id', async (req, res) => {
  try {
    const idx = apartmentsData.findIndex(a => a.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '公寓不存在' });
    }
    const body = req.body || {};
    const minPrice = body.minPrice !== undefined ? Number(body.minPrice) : apartmentsData[idx].minPrice;
    const maxPrice = body.maxPrice !== undefined ? Number(body.maxPrice) : apartmentsData[idx].maxPrice;
    if (Number.isNaN(minPrice) || minPrice < 0 || Number.isNaN(maxPrice) || maxPrice < 0) {
      return res.status(400).json({ success: false, message: '月租请输入有效数字且不能为负数' });
    }
    if (minPrice > maxPrice) {
      return res.status(400).json({ success: false, message: '最低月租不能大于最高月租' });
    }
    const name = body.name !== undefined ? body.name : apartmentsData[idx].name;
    const district = body.district !== undefined ? body.district : apartmentsData[idx].district;
    if (isDuplicateName(name, district, req.params.id)) {
      return res.status(400).json({ success: false, message: '公寓名称重复，同一区域内不能重名' });
    }
    const updated = {
      ...apartmentsData[idx],
      name,
      minPrice,
      maxPrice,
      address: body.address !== undefined ? body.address : apartmentsData[idx].address,
      district,
      remarks: body.remarks !== undefined ? body.remarks : apartmentsData[idx].remarks,
      images: Array.isArray(body.images) ? body.images : (apartmentsData[idx].images || []),
      videos: Array.isArray(body.videos) ? body.videos : (apartmentsData[idx].videos || [])
    };
    apartmentsData[idx] = updated;
    await saveApartments(apartmentsData);
    await reloadApartments();
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('❌ 更新公寓失败:', error);
    res.status(500).json({ success: false, message: error.message || '更新失败' });
  }
});

/** 管理端 - 删除公寓 */
app.delete('/api/admin/apartments/:id', async (req, res) => {
  try {
    const idx = apartmentsData.findIndex(a => a.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: '公寓不存在' });
    }
    apartmentsData.splice(idx, 1);
    await saveApartments(apartmentsData);
    await reloadApartments();
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('❌ 删除公寓失败:', error);
    res.status(500).json({ success: false, message: error.message || '删除失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`🔍 匹配接口: POST http://localhost:${PORT}/api/match`);
});
