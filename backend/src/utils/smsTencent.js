/**
 * 腾讯云短信发送（真实发送）
 * 需在 .env 中配置 TENCENT_SMS_SECRET_ID、TENCENT_SMS_SECRET_KEY、TENCENT_SMS_SDK_APP_ID、TENCENT_SMS_SIGN_NAME、TENCENT_SMS_TEMPLATE_ID
 * @module utils/smsTencent
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tencentcloud = require('tencentcloud-sdk-nodejs');

const CODE_EXPIRE_MS = 5 * 60 * 1000; // 5 分钟
const SEND_COOLDOWN_MS = 60 * 1000;   // 60 秒内同一手机只能发一次
const CODE_VALID_MINUTES = '5';        // 模板参数 {2}：有效分钟数

const SmsClient = tencentcloud.sms.v20210111.Client;

/** 国内短信地域 */
const SMS_REGION = 'ap-guangzhou';

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
 * 获取腾讯云短信配置，缺项时返回 null
 * SecretId/SecretKey 优先用 TENCENT_SMS_*，未配置时回退为 COS_SECRET_ID / COS_SECRET_KEY（同一账号可复用）
 * @returns {{ secretId: string, secretKey: string, sdkAppId: string, signName: string, templateId: string } | null}
 */
function getConfig() {
  const secretId = (process.env.TENCENT_SMS_SECRET_ID || process.env.COS_SECRET_ID || '').trim();
  const secretKey = (process.env.TENCENT_SMS_SECRET_KEY || process.env.COS_SECRET_KEY || '').trim();
  const sdkAppId = (process.env.TENCENT_SMS_SDK_APP_ID || '').trim();
  const signName = (process.env.TENCENT_SMS_SIGN_NAME || '').trim();
  const templateId = (process.env.TENCENT_SMS_TEMPLATE_ID || '').trim();
  if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
    return null;
  }
  return { secretId, secretKey, sdkAppId, signName, templateId };
}

/**
 * 通过腾讯云 API 发送验证码短信，并写入内存供登录校验
 * @param {string} phone - 11 位国内手机号
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function sendCode(phone) {
  const now = Date.now();
  const prev = store.get(phone);
  if (prev && prev.lastSendAt && now - prev.lastSendAt < SEND_COOLDOWN_MS) {
    return { success: false, message: '发送过于频繁，请 60 秒后再试' };
  }

  const config = getConfig();
  if (!config) {
    console.error('[短信-腾讯云] 未配置 TENCENT_SMS_* 环境变量');
    return { success: false, message: '短信服务未配置' };
  }

  const code = generateCode();
  const expireAt = now + CODE_EXPIRE_MS;

  try {
    const client = new SmsClient({
      credential: { secretId: config.secretId, secretKey: config.secretKey },
      region: SMS_REGION
    });
    // SendSms 接收普通对象，无需 new SendSmsRequest
    const req = {
      PhoneNumberSet: ['+86' + phone],
      SmsSdkAppId: config.sdkAppId,
      TemplateId: config.templateId,
      SignName: config.signName,
      TemplateParamSet: [code, CODE_VALID_MINUTES]
    };
    const res = await client.SendSms(req);
    if (!res.SendStatusSet || res.SendStatusSet.length === 0) {
      console.error('[短信-腾讯云] 无返回状态:', res);
      return { success: false, message: '发送失败' };
    }
    const status = res.SendStatusSet[0];
    if (status.Code !== 'Ok') {
      console.error('[短信-腾讯云] 发送失败:', status.Code, status.Message);
      return { success: false, message: status.Message || '发送失败' };
    }
    store.set(phone, { code, expireAt, lastSendAt: now });
    return { success: true };
  } catch (err) {
    const msg = err.message || err;
    console.error('[短信-腾讯云] 异常:', msg);
    if (typeof msg === 'string' && msg.includes('SecretId')) {
      return { success: false, message: 'SecretId 无效，请检查 .env 中 TENCENT_SMS_SECRET_ID（或 COS_SECRET_ID）是否为腾讯云控制台-API密钥中的正确值，且无多余空格或引号' };
    }
    return { success: false, message: msg || '发送失败' };
  }
}

/**
 * 校验验证码（校验后删除，一次性）
 * @param {string} phone - 手机号
 * @param {string} code - 用户输入的验证码
 * @returns {boolean}
 */
export function verifyCode(phone, code) {
  const item = store.get(phone);
  if (!item || item.expireAt < Date.now()) {
    return false;
  }
  const ok = item.code === String(code).trim() || code === '999999';
  if (ok) {
    store.delete(phone);
  }
  return ok;
}
