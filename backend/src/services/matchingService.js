/**
 * 租房匹配服务
 * 根据上班地点、通勤时长和预算匹配公寓；预算 + 直线距离粗筛后再调公交/骑行接口
 */
import { calculateCommuteTime, getCoordForAddress } from '../utils/tencentMapApi.js';

/** 直线距离粗筛：每分钟通勤对应的最大直线距离（公里），从 .env 的 KM_PER_COMMUTE_MINUTE 读取，默认 0.25 */
const KM_PER_COMMUTE_MINUTE = parseFloat(process.env.KM_PER_COMMUTE_MINUTE, 10) || 0.25;

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
 * 匹配公寓
 * @param {Object} params - 匹配参数
 * @param {string} params.workAddress - 上班地址
 * @param {number} params.commuteTime - 最大通勤时长（分钟）
 * @param {number} params.budget - 预算（元）
 * @param {Array} params.apartments - 公寓数据列表
 * @returns {Promise<{ results: Array, workLocation: Object }>}
 */
export async function matchApartments({ workAddress, commuteTime, budget, apartments }) {
  const results = [];
  let workLocation = null;

  // 1) 预算筛选
  const byBudget = apartments.filter(a => a.minPrice <= budget);
  console.log(`📊 预算筛选后剩余 ${byBudget.length}/${apartments.length} 个公寓`);

  if (byBudget.length === 0) {
    return { results, workLocation };
  }

  // 2) 上班地一次地理编码
  let workCoord;
  try {
    workCoord = await getCoordForAddress(workAddress);
  } catch (e) {
    console.error('上班地址解析失败:', e.message);
    throw new Error('上班地址解析失败，请检查地址是否正确');
  }

  // 3) 直线距离粗筛：只保留 straightKm <= commuteTime * KM_PER_COMMUTE_MINUTE 的公寓
  const maxStraightKm = commuteTime * KM_PER_COMMUTE_MINUTE;
  const candidates = [];
  for (const apartment of byBudget) {
    let lat;
    let lng;
    if (apartment.lat != null && apartment.lng != null && !Number.isNaN(apartment.lat) && !Number.isNaN(apartment.lng)) {
      lat = Number(apartment.lat);
      lng = Number(apartment.lng);
    } else {
      try {
        const coord = await getCoordForAddress(apartment.address);
        lat = coord.lat;
        lng = coord.lng;
      } catch (e) {
        console.error(`公寓地址解析失败 ${apartment.name}:`, e.message);
        continue;
      }
    }
    const straightKm = haversineKm(lat, lng, workCoord.lat, workCoord.lng);
    if (straightKm > maxStraightKm) {
      console.log(`⏭️ 直线距离 ${straightKm.toFixed(1)}km > ${maxStraightKm.toFixed(1)}km，跳过: ${apartment.name}`);
      continue;
    }
    candidates.push(apartment);
  }
  console.log(`📐 直线距离粗筛后剩余 ${candidates.length} 个候选，开始计算通勤（骑行/公交）`);

  // 4) 仅对候选调用通勤接口（骑行或公交）
  let processed = 0;
  for (const apartment of candidates) {
    processed++;
    try {
      const commuteInfo = await calculateCommuteTime(apartment.address, workAddress);
      if (!workLocation && commuteInfo.toCoord) {
        workLocation = commuteInfo.toCoord;
      }
      if (commuteInfo.duration <= commuteTime) {
        results.push({
          ...apartment,
          commuteTime: commuteInfo.duration,
          commuteDistance: commuteInfo.distance,
          commuteRoute: commuteInfo.route,
          recommendation: generateRecommendation(apartment, commuteInfo, budget),
          lat: commuteInfo.fromCoord?.lat,
          lng: commuteInfo.fromCoord?.lng
        });
        console.log(`✅ [${processed}/${candidates.length}] ${apartment.name} - 通勤${commuteInfo.duration}分钟，符合条件`);
      } else {
        console.log(`⏭️ [${processed}/${candidates.length}] ${apartment.name} - 通勤${commuteInfo.duration}分钟，超出要求，跳过`);
      }
    } catch (error) {
      console.error(`❌ [${processed}/${candidates.length}] ${apartment.name} - 计算失败:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  results.sort((a, b) => {
    if (a.commuteTime !== b.commuteTime) {
      return a.commuteTime - b.commuteTime;
    }
    return a.minPrice - b.minPrice;
  });

  return { results, workLocation };
}

/**
 * 生成推荐理由
 * @param {Object} apartment - 公寓信息
 * @param {Object} commuteInfo - 通勤信息
 * @param {number} budget - 预算
 * @returns {string} 推荐理由
 */
function generateRecommendation(apartment, commuteInfo, budget) {
  const reasons = [];
  
  // 通勤时间优势
  if (commuteInfo.duration <= 30) {
    reasons.push(`通勤时间仅${commuteInfo.duration}分钟，非常便利`);
  } else if (commuteInfo.duration <= 45) {
    reasons.push(`通勤时间${commuteInfo.duration}分钟，在可接受范围内`);
  } else {
    reasons.push(`通勤时间${commuteInfo.duration}分钟`);
  }

  // 价格优势
  const priceDiff = budget - apartment.minPrice;
  if (priceDiff > 500) {
    reasons.push(`价格${apartment.minPrice}元起，比预算低${priceDiff}元，性价比高`);
  } else if (priceDiff > 0) {
    reasons.push(`价格${apartment.minPrice}元起，在预算范围内`);
  } else {
    reasons.push(`价格${apartment.minPrice}元起`);
  }

  // 距离信息
  if (commuteInfo.distance) {
    reasons.push(`距离约${(commuteInfo.distance / 1000).toFixed(1)}公里`);
  }

  // 价格区间
  if (apartment.maxPrice && apartment.maxPrice > apartment.minPrice) {
    reasons.push(`租金范围：${apartment.minPrice}-${apartment.maxPrice}元`);
  }

  return reasons.join('；');
}
