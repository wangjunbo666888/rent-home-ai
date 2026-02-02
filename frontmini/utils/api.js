/**
 * 后端 API 封装（与 backend 接口一致）
 * @module utils/api
 */

const { post, get } = require('./request.js');
const config = require('../config.js');

/**
 * 租房匹配
 * @param {Object} params - { workAddress, commuteTime, budget }
 * @returns {Promise<{ success: boolean, data: Array, workLocation: Object }>}
 */
function match(params) {
  return post('/api/match', params);
}

/**
 * 上班地址输入联想
 * @param {string} keyword - 关键词
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
function suggestion(keyword) {
  const q = `keyword=${encodeURIComponent(keyword)}&region=${encodeURIComponent(config.suggestionRegion)}`;
  return get(`/api/suggestion?${q}`);
}

module.exports = { match, suggestion };
