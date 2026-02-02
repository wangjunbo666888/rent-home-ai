/**
 * 封装 wx.request，统一请求后端 API
 * @module utils/request
 */

const config = require('../config.js');

/**
 * 发起请求
 * @param {Object} options - 同 wx.request，url 可写相对路径（自动拼 baseUrl）
 * @returns {Promise<Object>} 解析后的 data（若接口返回 { success, data } 则返回 data，否则整包）
 */
function request(options) {
  const url = options.url.startsWith('http') ? options.url : config.baseUrl + options.url;
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data;
          if (data && data.success === false) {
            reject(new Error(data.message || '请求失败'));
            return;
          }
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
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

module.exports = { request, post, get };
