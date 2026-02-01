/**
 * 腾讯地图API工具函数
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY;
const API_BASE_URL = 'https://apis.map.qq.com/ws';

// 地址坐标缓存（避免重复调用API）
const geocodeCache = new Map();
// 路线规划缓存（避免重复计算相同路线）
const routeCache = new Map();

/**
 * 计算通勤时间（公共交通），并返回起终点坐标供地图打点使用
 * @param {string} from - 起点地址
 * @param {string} to - 终点地址
 * @returns {Promise<Object>} 通勤信息 { duration, distance, route, fromCoord, toCoord }
 */
export async function calculateCommuteTime(from, to) {
  if (!TENCENT_MAP_KEY) {
    throw new Error('腾讯地图API密钥未配置，请在.env文件中设置TENCENT_MAP_KEY');
  }

  try {
    // 检查路线缓存（修复通勤时间后需重启后端以清空旧缓存）
    const routeKey = `${from}|||${to}`;
    if (routeCache.has(routeKey)) {
      console.log('📦 使用缓存的路线数据');
      const cached = routeCache.get(routeKey);
      if (cached.fromCoord && cached.toCoord) return cached;
      const fromCoord = await geocodeWithCache(from);
      const toCoord = await geocodeWithCache(to);
      const result = { ...cached, fromCoord: { lat: fromCoord.lat, lng: fromCoord.lng }, toCoord: { lat: toCoord.lat, lng: toCoord.lng } };
      routeCache.set(routeKey, result);
      return result;
    }

    // 第一步：地理编码（地址转坐标）- 使用缓存
    const fromCoord = await geocodeWithCache(from);
    const toCoord = await geocodeWithCache(to);

    if (!fromCoord || !toCoord) {
      throw new Error('地址解析失败，请检查地址是否正确');
    }

    // 第二步：路线规划（公共交通）。注：WebService 接口不支持 policy 参数，使用默认策略（时间短）
    const routeUrl = `${API_BASE_URL}/direction/v1/transit`;
    const routeResponse = await axios.get(routeUrl, {
      params: {
        key: TENCENT_MAP_KEY,
        from: `${fromCoord.lat},${fromCoord.lng}`,
        to: `${toCoord.lat},${toCoord.lng}`,
        output: 'json'
      }
    });

    if (routeResponse.data.status !== 0) {
      throw new Error(`路线规划失败: ${routeResponse.data.message || '未知错误'}`);
    }

    const route = routeResponse.data.result?.routes?.[0];
    if (!route) {
      throw new Error('未找到合适的路线');
    }

    /**
     * 腾讯地图 API 文档：route.duration 单位为「分钟」，route.distance 单位为「米」
     */
    const totalDuration = Math.round(Number(route.duration) || 0);
    const totalDistance = Number(route.distance) || 0;

    // 生成路线描述
    const routeDescription = generateRouteDescription(route);

    const result = {
      duration: totalDuration,
      distance: totalDistance,
      route: routeDescription,
      fromCoord: { lat: fromCoord.lat, lng: fromCoord.lng },
      toCoord: { lat: toCoord.lat, lng: toCoord.lng }
    };

    // 缓存结果
    routeCache.set(routeKey, result);
    console.log('💾 已缓存路线数据');

    return result;

  } catch (error) {
    console.error('计算通勤时间错误:', error.message);
    throw new Error(`通勤时间计算失败: ${error.message}`);
  }
}

/**
 * 地理编码（带缓存）
 * @param {string} address - 地址
 * @returns {Promise<Object>} { lat, lng }
 */
async function geocodeWithCache(address) {
  // 检查缓存
  if (geocodeCache.has(address)) {
    console.log(`📦 使用缓存的地理编码: ${address}`);
    return geocodeCache.get(address);
  }

  // 调用API
  const coord = await geocode(address);
  
  // 缓存结果
  geocodeCache.set(address, coord);
  console.log(`💾 已缓存地理编码: ${address}`);

  return coord;
}

/**
 * 地理编码：地址转坐标
 * @param {string} address - 地址
 * @returns {Promise<Object>} { lat, lng }
 */
async function geocode(address) {
  const geocodeUrl = `${API_BASE_URL}/geocoder/v1/`;
  const response = await axios.get(geocodeUrl, {
    params: {
      key: TENCENT_MAP_KEY,
      address: address,
      output: 'json'
    }
  });

  if (response.data.status !== 0) {
    throw new Error(`地理编码失败: ${response.data.message || '未知错误'}`);
  }

  const location = response.data.result?.location;
  if (!location) {
    throw new Error('地址解析结果为空');
  }

  return {
    lat: location.lat,
    lng: location.lng
  };
}

/**
 * 生成路线描述
 * @param {Object} route - 路线对象
 * @returns {string} 路线描述
 */
function generateRouteDescription(route) {
  const descriptions = [];
  
  if (route.steps && Array.isArray(route.steps)) {
    route.steps.forEach((step, index) => {
      if (step.vehicle && step.vehicle.title) {
        const stationInfo = step.vehicle.stations ? `${step.vehicle.stations}站` : '';
        descriptions.push(`${step.vehicle.title}${stationInfo ? `（${stationInfo}）` : ''}`);
      } else if (step.instruction) {
        descriptions.push(step.instruction);
      }
    });
  }

  return descriptions.length > 0 ? descriptions.join(' → ') : '公共交通';
}
