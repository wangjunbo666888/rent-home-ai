/**
 * 腾讯地图API工具函数
 */
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY;
const API_BASE_URL = 'https://apis.map.qq.com/ws';

/**
 * 通勤方式切换阈值（公里）：直线距离 ≤ 该值时使用骑行，否则使用公交
 * 可通过环境变量 COMMUTE_CYCLING_THRESHOLD_KM 配置，默认 1.2
 */
const COMMUTE_CYCLING_THRESHOLD_KM = parseFloat(process.env.COMMUTE_CYCLING_THRESHOLD_KM || '1.2', 10) || 1.2;

// 地址坐标缓存（避免重复调用API）
const geocodeCache = new Map();
// 路线规划缓存（避免重复计算相同路线）
const routeCache = new Map();

/**
 * Haversine 直线距离（公里）
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 获取「当天北京时间中午12点」的 Unix 时间戳（秒）
 * 用于公交路线规划，避免深夜/凌晨公交停运导致通勤时间异常
 * @returns {number}
 */
function getBeijingNoonTimestamp() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  // 12:00 北京时间 = 04:00 UTC（东八区）
  const noonBeijing = new Date(Date.UTC(y, m, day, 4, 0, 0, 0));
  return Math.floor(noonBeijing.getTime() / 1000);
}

/**
 * 计算通勤时间：直线距离 ≤ 阈值时用骑行，否则用公交；返回起终点坐标供地图打点
 * @param {string} from - 起点地址
 * @param {string} to - 终点地址
 * @returns {Promise<Object>} 通勤信息 { duration, distance, route, fromCoord, toCoord }
 */
export async function calculateCommuteTime(from, to) {
  if (!TENCENT_MAP_KEY) {
    throw new Error('腾讯地图API密钥未配置，请在.env文件中设置TENCENT_MAP_KEY');
  }

  const cyclingKey = `cycling:${from}|||${to}`;
  const transitKey = `${from}|||${to}`;

  try {
    // 第一步：地理编码（地址转坐标）- 使用缓存
    const fromCoord = await geocodeWithCache(from);
    const toCoord = await geocodeWithCache(to);

    if (!fromCoord || !toCoord) {
      throw new Error('地址解析失败，请检查地址是否正确');
    }

    const straightLineKm = haversineKm(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng);
    const useCycling = straightLineKm <= COMMUTE_CYCLING_THRESHOLD_KM;

    if (useCycling) {
      // 直线距离 ≤ 阈值：骑行
      if (routeCache.has(cyclingKey)) {
        console.log('📦 使用缓存的骑行路线数据');
        const cached = routeCache.get(cyclingKey);
        if (cached.fromCoord && cached.toCoord) return cached;
        const result = { ...cached, fromCoord: { lat: fromCoord.lat, lng: fromCoord.lng }, toCoord: { lat: toCoord.lat, lng: toCoord.lng } };
        routeCache.set(cyclingKey, result);
        return result;
      }
      const result = await callBicyclingApi(fromCoord, toCoord, from, to);
      routeCache.set(cyclingKey, result);
      console.log('💾 已缓存骑行路线数据');
      return result;
    }

    // 直线距离 > 阈值：公交
    if (routeCache.has(transitKey)) {
      console.log('📦 使用缓存的公交路线数据');
      const cached = routeCache.get(transitKey);
      if (cached.fromCoord && cached.toCoord) return cached;
      const result = { ...cached, fromCoord: { lat: fromCoord.lat, lng: fromCoord.lng }, toCoord: { lat: toCoord.lat, lng: toCoord.lng } };
      routeCache.set(transitKey, result);
      return result;
    }
    const result = await callTransitApi(fromCoord, toCoord, from, to);
    routeCache.set(transitKey, result);
    console.log('💾 已缓存公交路线数据');
    return result;

  } catch (error) {
    console.error('计算通勤时间错误:', error.message);
    throw new Error(`通勤时间计算失败: ${error.message}`);
  }
}

/**
 * 调用腾讯地图骑行路线规划
 * @param {Object} fromCoord - { lat, lng }
 * @param {Object} toCoord - { lat, lng }
 * @param {string} from - 起点地址（日志用）
 * @param {string} to - 终点地址（日志用）
 * @returns {Promise<Object>} { duration, distance, route, fromCoord, toCoord }
 */
async function callBicyclingApi(fromCoord, toCoord, from, to) {
  console.log(`🚴 骑行路线请求（直线 ${(haversineKm(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng) * 1000).toFixed(0)}m ≤ ${COMMUTE_CYCLING_THRESHOLD_KM}km）: ${from.slice(0, 24)}... → ${to.slice(0, 24)}...`);
  const url = `${API_BASE_URL}/direction/v1/bicycling/`;
  const res = await axios.get(url, {
    params: {
      key: TENCENT_MAP_KEY,
      from: `${fromCoord.lat},${fromCoord.lng}`,
      to: `${toCoord.lat},${toCoord.lng}`,
      output: 'json'
    }
  });
  if (res.data.status !== 0) {
    throw new Error(`骑行路线规划失败: ${res.data.message || '未知错误'}`);
  }
  const route = res.data.result?.routes?.[0];
  if (!route) {
    throw new Error('未找到合适的骑行路线');
  }
  const duration = Math.round(Number(route.duration) || 0);
  const distance = Number(route.distance) || 0;
  console.log(`📊 骑行接口返回: duration=${duration}分钟, distance=${distance}米`);
  return {
    duration,
    distance,
    route: `骑行约${duration}分钟`,
    fromCoord: { lat: fromCoord.lat, lng: fromCoord.lng },
    toCoord: { lat: toCoord.lat, lng: toCoord.lng }
  };
}

/**
 * 调用腾讯地图公交路线规划
 * @param {Object} fromCoord - { lat, lng }
 * @param {Object} toCoord - { lat, lng }
 * @param {string} from - 起点地址（日志用）
 * @param {string} to - 终点地址（日志用）
 * @returns {Promise<Object>} { duration, distance, route, fromCoord, toCoord }
 */
async function callTransitApi(fromCoord, toCoord, from, to) {
  const departureTime = getBeijingNoonTimestamp();
  const departureDate = new Date(departureTime * 1000);
  console.log(`🕐 公交路线请求: departure_time=${departureTime} (北京时间 ${departureDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}), from=${from.slice(0, 24)}... → to=${to.slice(0, 24)}...`);
  const routeUrl = `${API_BASE_URL}/direction/v1/transit`;
  const routeResponse = await axios.get(routeUrl, {
    params: {
      key: TENCENT_MAP_KEY,
      from: `${fromCoord.lat},${fromCoord.lng}`,
      to: `${toCoord.lat},${toCoord.lng}`,
      output: 'json',
      departure_time: departureTime
    }
  });
  if (routeResponse.data.status !== 0) {
    throw new Error(`路线规划失败: ${routeResponse.data.message || '未知错误'}`);
  }
  const route = routeResponse.data.result?.routes?.[0];
  if (!route) {
    throw new Error('未找到合适的路线');
  }
  const totalDuration = Math.round(Number(route.duration) || 0);
  const totalDistance = Number(route.distance) || 0;
  console.log(`📊 公交接口返回: duration=${totalDuration}分钟, distance=${totalDistance}米`);
  const routeDescription = generateRouteDescription(route);
  return {
    duration: totalDuration,
    distance: totalDistance,
    route: routeDescription,
    fromCoord: { lat: fromCoord.lat, lng: fromCoord.lng },
    toCoord: { lat: toCoord.lat, lng: toCoord.lng }
  };
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
 * 地理编码（对外接口，带缓存）
 * 供预取上班地址、公寓保存坐标等调用，结果会写入缓存，匹配时可直接命中
 * @param {string} address - 地址
 * @returns {Promise<{ lat: number, lng: number }>}
 */
export async function getCoordForAddress(address) {
  if (!TENCENT_MAP_KEY) {
    throw new Error('腾讯地图API密钥未配置，请在.env文件中设置TENCENT_MAP_KEY');
  }
  if (!address || typeof address !== 'string' || !address.trim()) {
    throw new Error('地址不能为空');
  }
  return geocodeWithCache(address.trim());
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

/**
 * 关键词输入提示（地址联想）
 * @param {string} keyword - 搜索关键字
 * @param {string} [region='北京市'] - 搜索范围/城市名
 * @returns {Promise<Array>} 建议列表，每项含 id, title, address, location 等
 */
export async function getSuggestion(keyword, region = '北京市') {
  if (!TENCENT_MAP_KEY) {
    throw new Error('腾讯地图API密钥未配置，请在.env文件中设置TENCENT_MAP_KEY');
  }
  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    return [];
  }
  const url = `${API_BASE_URL}/place/v1/suggestion`;
  const response = await axios.get(url, {
    params: {
      key: TENCENT_MAP_KEY,
      keyword: keyword.trim(),
      region: region || '北京市',
      region_fix: 1, // 1=仅限当前城市，不扩大到全国；0=当前城市无结果时扩大到全国
      page_size: 10
    }
  });
  if (response.data.status !== 0) {
    throw new Error(response.data.message || '输入提示请求失败');
  }
  const list = response.data.data || [];
  return Array.isArray(list) ? list : [];
}
