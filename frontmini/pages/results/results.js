/**
 * 结果页：展示匹配的公寓列表与地图
 * 数据来自 globalData（首页匹配后写入）
 */
Page({
  data: {
    results: [],
    searchParams: null,
    workLocation: null,
    /** 地图 markers：上班地点 + 公寓点 */
    markers: [],
    /** 地图中心与缩放 */
    latitude: 39.908823,
    longitude: 116.397470,
    scale: 12
  },

  onLoad() {
    const app = getApp();
    const results = (app.globalData && app.globalData.matchResults) ? app.globalData.matchResults : [];
    const searchParams = (app.globalData && app.globalData.searchParams) ? app.globalData.searchParams : null;
    const workLocation = (app.globalData && app.globalData.workLocation) ? app.globalData.workLocation : null;

    const markers = this.buildMarkers(results, workLocation);
    /** 为每条结果预计算展示用文案（WXML 不支持 .toFixed 等复杂表达式） */
    const resultsWithText = (results || []).map(item => ({
      ...item,
      distanceText: item.commuteDistance == null ? '' : (item.commuteDistance < 1000 ? item.commuteDistance + '米' : (item.commuteDistance / 1000).toFixed(1) + '公里'),
      priceText: item.minPrice === item.maxPrice ? (item.minPrice + '元') : ((item.minPrice || '?') + '-' + (item.maxPrice || '?') + '元')
    }));
    let latitude = this.data.latitude;
    let longitude = this.data.longitude;
    if (workLocation && typeof workLocation.lat === 'number' && typeof workLocation.lng === 'number') {
      latitude = workLocation.lat;
      longitude = workLocation.lng;
    } else if (results.length > 0 && typeof results[0].lat === 'number' && typeof results[0].lng === 'number') {
      latitude = results[0].lat;
      longitude = results[0].lng;
    }

    this.setData({
      results: resultsWithText,
      searchParams,
      workLocation,
      markers,
      latitude,
      longitude
    });
  },

  /**
   * 构建地图 markers（上班地点 + 公寓）
   * @param {Array} results - 匹配结果
   * @param {Object} workLocation - { lat, lng }
   * @returns {Array} 小程序 map.markers 格式
   */
  buildMarkers(results, workLocation) {
    const list = [];
    if (workLocation && typeof workLocation.lat === 'number' && typeof workLocation.lng === 'number') {
      list.push({
        id: 0,
        latitude: workLocation.lat,
        longitude: workLocation.lng,
        title: '上班地点',
        width: 28,
        height: 28,
        callout: { content: '上班地点', display: 'ALWAYS', padding: 6, borderRadius: 4 }
      });
    }
    (results || []).forEach((item, index) => {
      if (typeof item.lat === 'number' && typeof item.lng === 'number') {
        list.push({
          id: index + 1,
          latitude: item.lat,
          longitude: item.lng,
          title: item.name || `公寓${index + 1}`,
          width: 28,
          height: 28,
          callout: { content: item.name || '', display: 'ALWAYS', padding: 6, borderRadius: 4 }
        });
      }
    });
    return list;
  },

  /** 跳转媒体详情（通过 eventChannel 传递公寓数据） */
  goMedia(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.results || [];
    const apartment = list[index];
    const searchParams = this.data.searchParams;
    if (!apartment) return;
    wx.navigateTo({
      url: '/pages/media/media',
      success(res) {
        res.eventChannel.emit('apartment', {
          apartment,
          results: list,
          searchParams
        });
      }
    });
  }
});
