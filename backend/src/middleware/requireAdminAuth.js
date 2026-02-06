/**
 * 管理员 JWT 认证中间件
 * 校验管理端请求的 token，与普通用户 token 分离
 * @module middleware/requireAdminAuth
 */
import jwt from 'jsonwebtoken';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'rent-home-admin-secret-change-in-production';

/**
 * 生成管理员 JWT
 * @param {string} adminId
 * @param {string} username
 * @returns {string}
 */
export function signAdminToken(adminId, username) {
  return jwt.sign(
    { adminId, username, type: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * 从 Authorization: Bearer <token> 解析并校验管理员 JWT，挂载 req.admin = { id, username }
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAdminAuth(req, res, next) {
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
    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    if (payload.type !== 'admin' || !payload.adminId || !payload.username) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: '登录已失效，请重新登录'
      });
    }
    req.admin = { id: payload.adminId, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: '登录已失效，请重新登录'
    });
  }
}
