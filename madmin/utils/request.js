/**
 * 封装 wx.request，统一请求后端 API（与 frontadmin 接口一致）
 * 管理端请求自动携带 adminToken，401 时清除 token 并跳转登录
 * @module utils/request
 */

const config = require('../config.js');

const TOKEN_KEY = 'adminToken';

/**
 * 401 时清除 token 并跳转登录页
 */
function handle401() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.showToast({ title: '登录已失效，请重新登录', icon: 'none' });
  wx.reLaunch({ url: '/pages/login/login' });
}

/**
 * 发起请求
 * @param {Object} options - 同 wx.request，url 可写相对路径（自动拼 baseUrl）
 * @returns {Promise<Object>} 解析后的 data（若接口返回 { success, data } 则返回整包，便于判断 success）
 */
function request(options) {
  const url = options.url.startsWith('http') ? options.url : config.baseUrl + options.url;
  const token = wx.getStorageSync(TOKEN_KEY);
  const headers = { ...(options.header || {}) };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  console.log('[request] 发起请求', { method: options.method || 'GET', url });
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url,
      header: headers,
      success(res) {
        console.log('[request] 响应', { url, statusCode: res.statusCode });
        if (res.statusCode === 401) {
          handle401();
          reject(new Error('请先登录'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data;
          if (data && data.success === false) {
            console.error('[request] 业务失败', { url, message: data.message });
            reject(new Error(data.message || '请求失败'));
            return;
          }
          resolve(data);
        } else {
          console.error('[request] HTTP 异常', { url, statusCode: res.statusCode, data: res.data });
          reject(new Error(res.data && res.data.message ? res.data.message : `HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        console.error('[request] 请求失败', { url, errMsg: err.errMsg, err });
        reject(err);
      }
    });
  });
}

/**
 * GET 请求
 * @param {string} url - 相对路径，可带 query
 * @returns {Promise<Object>}
 */
function get(url) {
  return request({ method: 'GET', url });
}

/**
 * POST JSON
 * @param {string} url - 相对路径
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
 * PUT JSON
 * @param {string} url - 相对路径
 * @param {Object} data - 请求体
 * @returns {Promise<Object>}
 */
function put(url, data) {
  return request({
    method: 'PUT',
    url,
    data,
    header: { 'Content-Type': 'application/json' }
  });
}

/**
 * DELETE 请求
 * @param {string} url - 相对路径
 * @returns {Promise<Object>}
 */
function del(url) {
  return request({ method: 'DELETE', url });
}

/**
 * 上传文件（用于公寓图片/视频上传，对应 backend /api/admin/upload）
 * @param {string} filePath - 本地文件路径（wx.chooseImage/chooseMedia 返回）
 * @param {string} type - 'image' | 'video'
 * @returns {Promise<{ success: boolean, url?: string, message?: string }>}
 */
function uploadFile(filePath, type = 'image') {
  return new Promise((resolve, reject) => {
    const url = config.baseUrl + '/api/admin/upload';
    const token = wx.getStorageSync(TOKEN_KEY);
    const header = token ? { 'Authorization': 'Bearer ' + token } : {};
    wx.uploadFile({
      url,
      filePath,
      name: 'file',
      formData: { type },
      header,
      success(res) {
        if (res.statusCode === 401) {
          handle401();
          reject(new Error('请先登录'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let data;
          try {
            data = JSON.parse(res.data);
          } catch (e) {
            reject(new Error('响应解析失败'));
            return;
          }
          if (data.success && data.url) {
            resolve(data);
          } else {
            reject(new Error(data.message || '上传失败'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: reject
    });
  });
}

module.exports = { request, get, post, put, del, uploadFile };
