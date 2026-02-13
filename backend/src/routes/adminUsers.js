/**
 * 管理端 - 用户与续费接口
 * GET  /api/admin/users  用户列表（手机号筛选、分页，带到期时间）
 * GET  /api/admin/users/:userId/subscriptions  某用户购买记录
 * POST /api/admin/users/:userId/renew  管理员为该用户续费
 * @module routes/adminUsers
 */
import express from 'express';
import { loadUsers, loadSubscriptions, saveSubscriptions } from '../utils/userDataLoader.js';

const router = express.Router();

const PLANS = {
  month: { name: '月度订阅', amount: 2900, days: 30 },
  quarter: { name: '季度订阅', amount: 7900, days: 90 }
};

/**
 * @param {Array} list
 * @returns {string}
 */
function nextOrderId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^SUB(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'SUB' + String(max + 1).padStart(6, '0');
}

/**
 * 计算续费后的到期时间
 * @param {Array} list
 * @param {string} userId
 * @param {string} currentOrderId
 * @param {Date|string} paidAt
 * @param {number} planDays
 * @returns {string}
 */
function computeNewExpireAt(list, userId, currentOrderId, paidAt, planDays) {
  const now = paidAt instanceof Date ? paidAt : new Date(paidAt);
  let baseTime = now.getTime();
  const otherPaid = list.filter(
    s => s.userId === userId && s.payStatus === 'paid' && s.id !== currentOrderId && s.expireAt
  );
  for (const o of otherPaid) {
    const t = new Date(o.expireAt).getTime();
    if (t > baseTime) baseTime = t;
  }
  return new Date(baseTime + planDays * 24 * 60 * 60 * 1000).toISOString();
}

/** 用户列表：手机号筛选、分页，每条带 expireAt、subscriptionCount */
router.get('/', async (req, res) => {
  try {
    const [users, subscriptions] = await Promise.all([loadUsers(), loadSubscriptions()]);
    const phone = (req.query.phone || '').trim().toLowerCase();
    let list = users.map(u => {
      const userSubs = subscriptions.filter(s => s.userId === u.id && s.payStatus === 'paid' && s.expireAt);
      const expireAt = userSubs.length
        ? userSubs.reduce((max, s) => (new Date(s.expireAt) > new Date(max) ? s.expireAt : max), userSubs[0].expireAt)
        : null;
      return {
        id: u.id,
        phone: u.phone,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        expireAt,
        subscriptionCount: subscriptions.filter(s => s.userId === u.id).length
      };
    });
    if (phone) {
      list = list.filter(u => (u.phone || '').toLowerCase().includes(phone));
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const total = list.length;
    const start = (page - 1) * pageSize;
    const data = list.slice(start, start + pageSize);
    res.json({ success: true, data, total });
  } catch (e) {
    console.error('❌ 管理端用户列表失败:', e);
    res.status(500).json({ success: false, message: e.message || '获取用户列表失败' });
  }
});

/** 某用户的购买记录 */
router.get('/:userId/subscriptions', async (req, res) => {
  try {
    const users = await loadUsers();
    const user = users.find(u => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const subscriptions = await loadSubscriptions();
    const list = subscriptions
      .filter(s => s.userId === req.params.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({
      success: true,
      data: {
        user: { id: user.id, phone: user.phone },
        list
      }
    });
  } catch (e) {
    console.error('❌ 获取用户购买记录失败:', e);
    res.status(500).json({ success: false, message: e.message || '获取失败' });
  }
});

/** 管理员为该用户续费（无需真实支付：支付人=管理员，金额=0，支付时间=当前系统时间） */
router.post('/:userId/renew', async (req, res) => {
  try {
    const users = await loadUsers();
    const user = users.find(u => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const plan = (req.body && req.body.plan) ? String(req.body.plan).toLowerCase() : '';
    if (plan !== 'month' && plan !== 'quarter') {
      return res.status(400).json({ success: false, message: '请选择套餐：month 或 quarter' });
    }
    const config = PLANS[plan];
    const paidAt = new Date();

    const list = await loadSubscriptions();
    const id = nextOrderId(list);
    const expireAt = computeNewExpireAt(list, user.id, id, paidAt, config.days);
    const order = {
      id,
      userId: user.id,
      plan,
      amount: 0,
      payStatus: 'paid',
      paidAt: paidAt.toISOString(),
      expireAt,
      createdAt: new Date().toISOString(),
      wxTransactionId: null,
      payer: '管理员'
    };
    list.push(order);
    await saveSubscriptions(list);

    res.status(201).json({
      success: true,
      data: order,
      message: '续费成功'
    });
  } catch (e) {
    console.error('❌ 管理端续费失败:', e);
    res.status(500).json({ success: false, message: e.message || '续费失败' });
  }
});

export default router;
