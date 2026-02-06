/**
 * 管理员登录接口
 * POST /api/admin/auth/login - 用户名+密码登录
 * @module routes/adminAuth
 */
import express from 'express';
import { loadAdmins } from '../utils/adminDataLoader.js';
import { signAdminToken } from '../middleware/requireAdminAuth.js';

const router = express.Router();

/**
 * 管理员登录
 * Body: { username: string, password: string }
 */
router.post('/login', async (req, res) => {
  const username = (req.body && req.body.username) ? String(req.body.username).trim() : '';
  const password = (req.body && req.body.password) ? String(req.body.password) : '';

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '请输入用户名和密码'
    });
  }

  try {
    const admins = await loadAdmins();
    const admin = admins.find(a => a.username === username);
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    // 暂用明文密码比对
    if (admin.password !== password) {
      return res.status(400).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const token = signAdminToken(admin.id, admin.username);
    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (err) {
    console.error('管理员登录失败:', err);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

export default router;
