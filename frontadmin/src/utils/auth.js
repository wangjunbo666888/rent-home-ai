/**
 * 管理端认证工具
 * token 存 localStorage，请求时携带，401 时清除并跳转登录
 * @module utils/auth
 */

const TOKEN_KEY = 'adminToken';

/**
 * 获取管理员 token
 * @returns {string|null}
 */
export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 保存管理员 token
 * @param {string} token
 */
export function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * 清除管理员 token
 */
export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * 是否已登录（有 token）
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!getAdminToken();
}

/**
 * 带认证的 fetch，自动添加 Authorization 头，401 时清除 token 并跳转登录
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function authFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearAdminToken();
    window.location.href = '/login';
    throw new Error('请先登录');
  }

  return res;
}
