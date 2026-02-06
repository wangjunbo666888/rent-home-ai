/**
 * 假短信发送（开发用）
 * 后续可替换为腾讯云短信 API
 * @module utils/smsFake
 */

const CODE_EXPIRE_MS = 5 * 60 * 1000; // 5 分钟
const SEND_COOLDOWN_MS = 60 * 1000;   // 60 秒内同一手机只能发一次

/** 内存存储：phone -> { code, expireAt, lastSendAt } */
const store = new Map();

/**
 * 生成 6 位数字验证码
 * @returns {string}
 */
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 假发送验证码：仅打印到控制台，并写入内存供登录校验
 * @param {string} phone - 手机号
 * @returns {{ success: boolean, code?: string, message?: string }}
 */
export function sendCode(phone) {
  const now = Date.now();
  const prev = store.get(phone);
  if (prev && prev.lastSendAt && now - prev.lastSendAt < SEND_COOLDOWN_MS) {
    return { success: false, message: '发送过于频繁，请 60 秒后再试' };
  }
  const code = generateCode();
  const expireAt = now + CODE_EXPIRE_MS;
  store.set(phone, { code, expireAt, lastSendAt: now });
  // 开发环境：控制台打印，便于测试
  console.log(`[短信-假发送] 手机号: ${phone}, 验证码: ${code} (5分钟内有效)`);
  return { success: true };
}

/**
 * 校验验证码（校验后删除，一次性）
 * @param {string} phone
 * @param {string} code
 * @returns {boolean}
 */
export function verifyCode(phone, code) {
  const item = store.get(phone);
  if (!item || item.expireAt < Date.now()) {
    return false;
  }
  // code 和内存中的item.code比较 或者 code = 999999,只要有一个正确就返回true
  const ok = item.code === String(code).trim() || code === '999999';
  if (ok) {
    store.delete(phone);
  }
  return ok;
}
