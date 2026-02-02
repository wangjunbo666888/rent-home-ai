/**
 * 租房匹配服务
 * 根据上班地点、通勤时长和预算匹配公寓
 */
import { calculateCommuteTime } from '../utils/tencentMapApi.js';

/**
 * 匹配公寓
 * @param {Object} params - 匹配参数
 * @param {string} params.workAddress - 上班地址
 * @param {number} params.commuteTime - 最大通勤时长（分钟）
 * @param {number} params.budget - 预算（元）
 * @param {Array} params.apartments - 公寓数据列表
 * @returns {Promise<Array>} 匹配结果列表
 */
export async function matchApartments({ workAddress, commuteTime, budget, apartments }) {
  const results = [];
  let workLocation = null;
  let processedCount = 0;

  console.log(`📊 开始处理 ${apartments.length} 个公寓...`);

  // 遍历所有公寓，计算通勤时间
  for (const apartment of apartments) {
    processedCount++;
    
    // 预算筛选：使用最低月租金
    if (apartment.minPrice > budget) {
      console.log(`⏭️  [${processedCount}/${apartments.length}] ${apartment.name} - 价格超出预算，跳过`);
      continue;
    }

    try {
      // 计算通勤时间（家→公司：from=公寓 to=上班地址，与用户「从家到公司」语义一致，避免部分路线接口返回异常长距离）
      console.log(`🔄 [${processedCount}/${apartments.length}] 正在计算 ${apartment.name} 的通勤时间...`);
      const commuteInfo = await calculateCommuteTime(apartment.address, workAddress);
      
      // 通勤时间筛选。commuteInfo 为「公寓→上班」：fromCoord=公寓，toCoord=上班地点
      if (commuteInfo.duration <= commuteTime) {
        if (!workLocation && commuteInfo.toCoord) {
          workLocation = commuteInfo.toCoord;
        }
        results.push({
          ...apartment,
          commuteTime: commuteInfo.duration,
          commuteDistance: commuteInfo.distance,
          commuteRoute: commuteInfo.route,
          recommendation: generateRecommendation(apartment, commuteInfo, budget),
          lat: commuteInfo.fromCoord?.lat,
          lng: commuteInfo.fromCoord?.lng
        });
        console.log(`✅ [${processedCount}/${apartments.length}] ${apartment.name} - 通勤${commuteInfo.duration}分钟，符合条件`);
      } else {
        console.log(`⏭️  [${processedCount}/${apartments.length}] ${apartment.name} - 通勤${commuteInfo.duration}分钟，超出要求，跳过`);
      }
    } catch (error) {
      console.error(`❌ [${processedCount}/${apartments.length}] ${apartment.name} - 计算失败:`, error.message);
      // 继续处理下一个公寓
      continue;
    }

    // 添加延迟，避免「此key每秒请求量已达到上限」
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  // 排序：优先通勤时间短，其次价格低
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
