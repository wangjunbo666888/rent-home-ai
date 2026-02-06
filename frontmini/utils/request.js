/**
 * 封装 wx.request，统一请求后端 API
 * 自动携带 token，401/403 时跳转登录或提示订阅
 * @module utils/request
 */

const config = require('../config.js');

/**
 * 获取本地 token
 * @returns {string|null}
 */
function getToken() {
  try {
    return wx.getStorageSync('token') || null;
  } catch (e) {
    return null;
  }
}

/**
 * 发起请求（自动带 Authorization，401 跳转登录，403 提示订阅）
 * @param {Object} options - 同 wx.request，url 可写相对路径（自动拼 baseUrl）
 * @returns {Promise<Object>} 解析后的 data（若接口返回 { success, data } 则返回 data，否则整包）
 */
function request(options) {
  const url = options.url.startsWith('http') ? options.url : config.baseUrl + options.url;
  const token = getToken();
  const headers = options.header || {};
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url,
      header: headers,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data;
          if (data && data.success === false) {
            reject(new Error(data.message || '请求失败'));
            return;
          }
          resolve(data);
        } else if (res.statusCode === 401) {
          const data = res.data;
          wx.removeStorageSync('token');
          wx.navigateTo({ url: '/pages/login/login' });
          reject(new Error((data && data.message) ? data.message : '请先登录'));
        } else if (res.statusCode === 403) {
          const data = res.data;
          const code = (data && data.code) === 'SUBSCRIPTION_EXPIRED' ? 'SUBSCRIPTION_EXPIRED' : 'FORBIDDEN';
          const msg = (data && data.message) ? data.message : '请先开通或续费订阅服务';
          wx.showToast({ title: msg, icon: 'none', duration: 2500 });
          reject(new Error(msg));
        } else {
          const data = res.data;
          reject(new Error((data && data.message) ? data.message : `请求失败 ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/**
 * POST JSON
 * @param {string} url - 相对路径，如 /api/match
 * @param {Object} data - 请求体
 * @returns {Promise<Object>}
 */
function post(url, data) {
  return request({
    method: 'POST',
    url,
    data,
    header: { 'Content-Type': 'application/json' }
  });
}

/**
 * GET 请求
 * @param {string} url - 相对路径，可带 query，如 /api/suggestion?keyword=亮马河
 * @returns {Promise<Object>}
 */
function get(url) {
  return request({ method: 'GET', url });
}

module.exports = { request, post, get, getToken };
