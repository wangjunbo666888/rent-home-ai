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

/** ---------- 登录 ---------- */

/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @returns {Promise<{ success: boolean }>}
 */
function sendCode(phone) {
  return post('/api/auth/send-code', { phone });
}

/**
 * 验证码登录
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{ success: boolean, token: string, user: Object }>}
 */
function login(phone, code) {
  return post('/api/auth/login', { phone, code });
}

/**
 * 当前用户信息（含订阅到期日）
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function getProfile() {
  return get('/api/auth/profile');
}

/** ---------- 订阅 ---------- */

/**
 * 创建订阅订单（月/季）
 * @param {string} plan - 'month' | 'quarter'
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function createOrder(plan) {
  return post('/api/subscription/create', { plan });
}

/**
 * 手动标记订单已支付
 * @param {string} orderId - 订单号
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function markOrderPaid(orderId) {
  return post('/api/subscription/mark-paid', { orderId });
}

/**
 * 我的订单与订阅状态
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function getMySubscription() {
  return get('/api/subscription/my');
}

module.exports = {
  match,
  suggestion,
  sendCode,
  login,
  getProfile,
  createOrder,
  markOrderPaid,
  getMySubscription
};
