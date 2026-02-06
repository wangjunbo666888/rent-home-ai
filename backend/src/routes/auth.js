/**
 * 登录与用户相关接口
 * POST /api/auth/send-code 发送验证码（当前为假发送）
 * POST /api/auth/login    验证码登录
 * GET  /api/auth/profile  当前用户信息（含订阅到期日）
 */
import express from 'express';
import { sendCode, verifyCode } from '../utils/smsFake.js';
import { loadUsers, saveUsers } from '../utils/userDataLoader.js';
import { loadSubscriptions } from '../utils/userDataLoader.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = express.Router();

const PHONE_REG = /^1\d{10}$/;

/**
 * 生成新用户 ID
 * @param {Array} list
 * @returns {string}
 */
function nextUserId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^U(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'U' + String(max + 1).padStart(4, '0');
}

/** 发送验证码 */
router.post('/send-code', (req, res) => {
  const phone = (req.body && req.body.phone) ? String(req.body.phone).trim() : '';
  if (!PHONE_REG.test(phone)) {
    return res.status(400).json({
      success: false,
      message: '请输入正确的手机号'
    });
  }
  const result = sendCode(phone);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: result.message || '发送失败'
    });
  }
  res.json({ success: true, message: '验证码已发送' });
});

/** 验证码登录 */
router.post('/login', async (req, res) => {
  const phone = (req.body && req.body.phone) ? String(req.body.phone).trim() : '';
  const code = (req.body && req.body.code) ? String(req.body.code).trim() : '';
  if (!PHONE_REG.test(phone)) {
    return res.status(400).json({
      success: false,
      message: '请输入正确的手机号'
    });
  }
  if (!code || code.length < 4) {
    return res.status(400).json({
      success: false,
      message: '请输入验证码'
    });
  }
  if (!verifyCode(phone, code)) {
    return res.status(400).json({
      success: false,
      message: '验证码错误或已过期'
    });
  }
  try {
    let users = await loadUsers();
    let user = users.find(u => u.phone === phone);
    const now = new Date().toISOString();
    if (!user) {
      user = {
        id: nextUserId(users),
        phone,
        createdAt: now,
        updatedAt: now
      };
      users.push(user);
      await saveUsers(users);
    } else {
      user.updatedAt = now;
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) users[idx] = user;
      await saveUsers(users);
    }
    const token = signToken(user.id, user.phone);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
});

/** 当前用户信息（需登录），含订阅到期日 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const subscriptions = await loadSubscriptions();
    const now = new Date().toISOString();
    const valid = subscriptions
      .filter(s => s.userId === req.user.id && s.payStatus === 'paid' && s.expireAt > now)
      .sort((a, b) => (b.expireAt > a.expireAt ? 1 : -1));
    const expireAt = valid.length > 0 ? valid[0].expireAt : null;
    res.json({
      success: true,
      data: {
        id: req.user.id,
        phone: req.user.phone,
        subscriptionExpireAt: expireAt,
        hasActiveSubscription: !!expireAt
      }
    });
  } catch (err) {
    console.error('获取 profile 失败:', err);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

export default router;
