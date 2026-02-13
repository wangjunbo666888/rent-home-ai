/**
 * 短信发送统一入口
 * 通过环境变量 SMS_USE_REAL=true 切换为腾讯云真实发送，否则为假发送（控制台打印）
 * @module utils/sms
 */
import * as smsFake from './smsFake.js';
import * as smsTencent from './smsTencent.js';

const useReal = process.env.SMS_USE_REAL === 'true';

/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function sendCode(phone) {
  if (useReal) {
    return smsTencent.sendCode(phone);
  }
  return Promise.resolve(smsFake.sendCode(phone));
}

/**
 * 校验验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {boolean}
 */
export function verifyCode(phone, code) {
  if (useReal) {
    return smsTencent.verifyCode(phone, code);
  }
  return smsFake.verifyCode(phone, code);
}
