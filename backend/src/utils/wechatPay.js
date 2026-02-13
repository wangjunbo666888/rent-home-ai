/**
 * 微信支付 APIv3 工具（JSAPI 下单、回调验签与解密）
 * 证书放在 apiclient_cert/ 目录，.env 配置商户号、APIv3 密钥、小程序 AppID 等
 * @module utils/wechatPay
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WXPAY_API_BASE = 'https://api.mch.weixin.qq.com';
const CODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';

let privateKeyPem = null;
let serialNo = null;
let apiv3Key = null;
let mchid = null;
let appid = null;
let notifyUrl = null;
/** 平台证书缓存：serial -> public key pem */
const platformCertCache = new Map();

/**
 * 从环境变量与证书目录加载配置
 * @returns {{ enabled: boolean, message?: string }}
 */
export function loadConfig() {
  const certDir = process.env.WXPAY_CERT_DIR || 'apiclient_cert';
  const certPath = path.isAbsolute(certDir)
    ? path.join(certDir, 'apiclient_key.pem')
    : path.join(process.cwd(), certDir, 'apiclient_key.pem');

  if (!process.env.WXPAY_MCHID || !process.env.WXPAY_APIV3_KEY || !process.env.WXPAY_APPID) {
    return { enabled: false, message: '缺少 WXPAY_MCHID / WXPAY_APIV3_KEY / WXPAY_APPID' };
  }
  if (!process.env.WXPAY_NOTIFY_URL) {
    return { enabled: false, message: '缺少 WXPAY_NOTIFY_URL' };
  }
  if (!fs.existsSync(certPath)) {
    return { enabled: false, message: `证书文件不存在: ${certPath}` };
  }

  try {
    privateKeyPem = fs.readFileSync(certPath, 'utf-8');
    serialNo = process.env.WXPAY_SERIAL_NO || getSerialFromCert(path.join(path.dirname(certPath), 'apiclient_cert.pem'));
    apiv3Key = process.env.WXPAY_APIV3_KEY;
    mchid = process.env.WXPAY_MCHID;
    appid = process.env.WXPAY_APPID;
    notifyUrl = process.env.WXPAY_NOTIFY_URL;
    return { enabled: true };
  } catch (e) {
    return { enabled: false, message: e.message || '加载证书失败' };
  }
}

/**
 * 从 apiclient_cert.pem 读取证书序列号（十六进制）
 * Node 15+ 使用 X509Certificate，否则需在 .env 配置 WXPAY_SERIAL_NO（openssl x509 -in apiclient_cert.pem -noout -serial）
 * @param {string} certPath
 * @returns {string}
 */
function getSerialFromCert(certPath) {
  if (!fs.existsSync(certPath)) return '';
  try {
    const pem = fs.readFileSync(certPath, 'utf-8');
    if (typeof crypto.X509Certificate !== 'undefined') {
      const cert = new crypto.X509Certificate(pem);
      return (cert.serialNumber || '').replace(/^0+/, '') || '';
    }
  } catch (_) {}
  return '';
}

/**
 * 生成 V3 请求签名并返回 Authorization 头
 * @param {string} method - GET/POST/PUT 等
 * @param {string} urlPath - 如 /v3/pay/transactions/jsapi
 * @param {string} body - JSON 字符串，GET 为空字符串
 * @returns {{ authorization: string, timestamp: string, nonce: string }}
 */
function signRequest(method, urlPath, body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonce}\n${body}\n`;
  const sign = crypto.createSign('RSA-SHA256').update(message).sign(privateKeyPem, 'base64');
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${sign}",timestamp="${timestamp}",serial_no="${serialNo}"`;
  return { authorization, timestamp, nonce };
}

/**
 * 小程序 code 换 openid
 * @param {string} code - wx.login() 返回的 code
 * @returns {Promise<{ openid: string }|{ errcode: number, errmsg: string }>}
 */
export async function getOpenid(code) {
  const secret = process.env.WXPAY_APP_SECRET;
  if (!secret) {
    throw new Error('未配置 WXPAY_APP_SECRET，无法通过 code 获取 openid');
  }
  const res = await axios.get(CODE2SESSION_URL, {
    params: { appid: appid, secret, js_code: code, grant_type: 'authorization_code' }
  });
  const data = res.data || {};
  if (data.openid) return { openid: data.openid };
  return { errcode: data.errcode || -1, errmsg: data.errmsg || 'unknown' };
}

/**
 * JSAPI 下单，返回 prepay_id
 * @param {string} outTradeNo - 商户订单号
 * @param {number} totalCents - 金额（分）
 * @param {string} description - 商品描述
 * @param {string} openid - 用户 openid
 * @returns {Promise<{ prepay_id: string }>}
 */
export async function createJsapiPrepay(outTradeNo, totalCents, description, openid) {
  const urlPath = '/v3/pay/transactions/jsapi';
  const body = {
    appid,
    mchid,
    description,
    out_trade_no: outTradeNo,
    notify_url: notifyUrl,
    amount: { total: totalCents, currency: 'CNY' },
    payer: { openid }
  };
  const bodyStr = JSON.stringify(body);
  const { authorization } = signRequest('POST', urlPath, bodyStr);
  const res = await axios.post(`${WXPAY_API_BASE}${urlPath}`, body, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authorization
    }
  });
  const prepayId = res.data && res.data.prepay_id;
  if (!prepayId) throw new Error(res.data && res.data.message ? res.data.message : '微信下单未返回 prepay_id');
  return { prepay_id: prepayId };
}

/**
 * 生成小程序调起支付所需参数（wx.requestPayment）
 * @param {string} prepayId
 * @returns {{ appId: string, timeStamp: string, nonceStr: string, package: string, signType: string, paySign: string }}
 */
export function buildPaymentParams(prepayId) {
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const packageVal = `prepay_id=${prepayId}`;
  const message = `${appid}\n${timeStamp}\n${nonceStr}\n${packageVal}\n`;
  const paySign = crypto.createSign('RSA-SHA256').update(message).sign(privateKeyPem, 'base64');
  return {
    appId: appid,
    timeStamp,
    nonceStr,
    package: packageVal,
    signType: 'RSA',
    paySign
  };
}

/**
 * 验签并解密的支付回调结果
 * @param {object} req - Express req，需 rawBody 或 body 为原始 JSON 字符串
 * @returns {Promise<{ out_trade_no: string, trade_state: string, transaction_id: string }|null>}
 */
export async function verifyNotifyAndDecrypt(req) {
  const wechatSignature = req.headers['wechatpay-signature'];
  const wechatSerial = req.headers['wechatpay-serial'];
  const wechatTimestamp = req.headers['wechatpay-timestamp'];
  const wechatNonce = req.headers['wechatpay-nonce'];
  const rawBody = typeof req.rawBody === 'string' ? req.rawBody : (req.body && typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
  if (!wechatSignature || !wechatSerial || !wechatTimestamp || !wechatNonce) {
    return null;
  }
  const publicKey = await getPlatformPublicKey(wechatSerial);
  if (!publicKey) return null;
  const message = `${wechatTimestamp}\n${wechatNonce}\n${rawBody}\n`;
  const ok = crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, wechatSignature, 'base64');
  if (!ok) return null;
  const obj = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(rawBody);
  const ciphertext = obj && obj.resource && obj.resource.ciphertext;
  const nonce = obj && obj.resource && obj.resource.nonce;
  const associatedData = obj && obj.resource && obj.resource.associated_data;
  if (!ciphertext || !nonce || associatedData === undefined) return null;
  const decrypted = decryptAesGcm(Buffer.from(ciphertext, 'base64'), apiv3Key, nonce, associatedData);
  const event = JSON.parse(decrypted);
  const out_trade_no = event.out_trade_no;
  const trade_state = event.trade_state;
  const transaction_id = event.transaction_id;
  return { out_trade_no, trade_state, transaction_id };
}

/**
 * AES-256-GCM 解密（微信回调 resource）
 */
function decryptAesGcm(ciphertext, key, nonce, aad) {
  const keyBuf = Buffer.from(key, 'utf-8');
  const nonceBuf = Buffer.from(nonce, 'base64');
  const aadBuf = Buffer.from(aad || '', 'utf-8');
  const authTag = ciphertext.slice(-16);
  const data = ciphertext.slice(0, -16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, nonceBuf);
  decipher.setAuthTag(authTag);
  decipher.setAAD(aadBuf);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
}

/**
 * 获取微信平台证书公钥（带缓存，通过商户证书请求）
 * @param {string} serial
 * @returns {Promise<string|null>} PEM 公钥
 */
async function getPlatformPublicKey(serial) {
  if (platformCertCache.has(serial)) return platformCertCache.get(serial);
  const urlPath = '/v3/certificates';
  const { authorization } = signRequest('GET', urlPath, '');
  const res = await axios.get(`${WXPAY_API_BASE}${urlPath}`, {
    headers: { 'Authorization': authorization }
  });
  const list = res.data && res.data.data;
  if (!Array.isArray(list)) return null;
  for (const item of list) {
    const s = item.serial_no;
    const encrypted = item.encrypt_certificate;
    if (!encrypted || !encrypted.ciphertext || !encrypted.nonce || encrypted.associated_data === undefined) continue;
    const decrypted = decryptAesGcm(
      Buffer.from(encrypted.ciphertext, 'base64'),
      apiv3Key,
      encrypted.nonce,
      encrypted.associated_data
    );
    platformCertCache.set(s, decrypted);
  }
  return platformCertCache.get(serial) || null;
}

/**
 * 是否已启用微信支付（配置与证书齐全）
 * @returns {boolean}
 */
export function isEnabled() {
  if (!privateKeyPem || !apiv3Key || !mchid || !appid || !notifyUrl) return false;
  return true;
}
