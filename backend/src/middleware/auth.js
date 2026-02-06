/**
 * JWT 认证与订阅校验中间件
 * @module middleware/auth
 */
import jwt from 'jsonwebtoken';
import { loadUsers, loadSubscriptions } from '../utils/userDataLoader.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rent-home-dev-secret-change-in-production';

/**
 * 从 Authorization: Bearer <token> 解析并校验 JWT，挂载 req.user = { id, phone }
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  const raw = req.headers.authorization;
  const token = raw && raw.startsWith('Bearer ') ? raw.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '请先登录'
    });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.userId || !payload.phone) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '登录已失效，请重新登录'
      });
    }
    req.user = { id: payload.userId, phone: payload.phone };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '登录已失效，请重新登录'
    });
  }
}

/**
 * 校验登录且订阅未过期。依赖 requireAuth 已挂载 req.user
 * 需在 requireAuth 之后使用；会查询 data/subscriptions 得到用户最新到期时间
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireSubscription(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '请先登录'
    });
  }
  try {
    const subscriptions = await loadSubscriptions();
    const now = new Date().toISOString();
    const valid = subscriptions
      .filter(s => s.userId === req.user.id && s.payStatus === 'paid' && s.expireAt > now)
      .sort((a, b) => (b.expireAt > a.expireAt ? 1 : -1));
    const expireAt = valid.length > 0 ? valid[0].expireAt : null;
    if (!expireAt) {
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: '请先开通或续费订阅服务'
      });
    }
    req.subscriptionExpireAt = expireAt;
    next();
  } catch (err) {
    console.error('订阅校验失败:', err);
    return res.status(500).json({
      success: false,
      message: '服务异常，请稍后重试'
    });
  }
}

/**
 * 生成 JWT
 * @param {string} userId
 * @param {string} phone
 * @returns {string}
 */
export function signToken(userId, phone) {
  return jwt.sign(
    { userId, phone },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
