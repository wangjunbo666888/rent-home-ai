/**
 * 公寓管理相关 API（复用 backend 管理端接口）
 * @module utils/api
 */

const { get, post, put, del, uploadFile } = require('./request.js');
const config = require('../config.js');

const API_BASE = '/api/admin/apartments';

/**
 * 获取公寓列表
 * @returns {Promise<{ success: boolean, data: Array, total: number }>}
 */
function getApartmentList() {
  return get(API_BASE);
}

/**
 * 获取单条公寓详情
 * @param {string} id - 公寓 ID
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function getApartmentDetail(id) {
  return get(`${API_BASE}/${id}`);
}

/**
 * 新增公寓
 * @param {Object} data - 公寓数据
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function createApartment(data) {
  return post(API_BASE, data);
}

/**
 * 更新公寓
 * @param {string} id - 公寓 ID
 * @param {Object} data - 公寓数据
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
function updateApartment(id, data) {
  return put(`${API_BASE}/${id}`, data);
}

/**
 * 删除公寓
 * @param {string} id - 公寓 ID
 * @returns {Promise<{ success: boolean }>}
 */
function deleteApartment(id) {
  return del(`${API_BASE}/${id}`);
}

/**
 * 检查同一区域内公寓名是否重复
 * @param {Object} params - { name, district, id? }
 * @returns {Promise<{ success: boolean, duplicate: boolean }>}
 */
function checkName(params) {
  return post(`${API_BASE}/check-name`, params);
}

/**
 * 获取区域下拉列表
 * @returns {Promise<{ success: boolean, data: string[] }>}
 */
function getDistricts() {
  return get('/api/admin/districts');
}

/**
 * 地址联想（管理端接口，需 adminToken）
 * @param {string} keyword
 * @returns {Promise<{ success: boolean, data: Array }>}
 */
function suggestion(keyword) {
  const region = encodeURIComponent(config.suggestionRegion || '北京市');
  const k = encodeURIComponent(keyword);
  return get(`/api/admin/suggestion?keyword=${k}&region=${region}`);
}

/**
 * 上传图片到 COS
 * @param {string} filePath - 本地临时路径
 * @returns {Promise<{ success: boolean, url: string }>}
 */
function uploadImage(filePath) {
  return uploadFile(filePath, 'image');
}

/**
 * 上传视频到 COS
 * @param {string} filePath - 本地临时路径
 * @returns {Promise<{ success: boolean, url: string }>}
 */
function uploadVideo(filePath) {
  return uploadFile(filePath, 'video');
}

module.exports = {
  getApartmentList,
  getApartmentDetail,
  createApartment,
  updateApartment,
  deleteApartment,
  checkName,
  getDistricts,
  suggestion,
  uploadImage,
  uploadVideo
};
