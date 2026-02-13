/**
 * 管理端 - 用户与续费接口
 * GET  /api/admin/users  用户列表（手机号筛选、分页，带到期时间）
 * GET  /api/admin/users/:userId/subscriptions  某用户购买记录
 * POST /api/admin/users/:userId/renew  管理员为该用户续费
 * @module routes/adminUsers
 */
import express from 'express';
import { loadUsers, loadSubscriptions, saveSubscriptions } from '../utils/userDataLoader.js';
import { loadOrders, saveOrders, nextOrderId, nextOrderNo } from '../utils/orderDataLoader.js';

const router = express.Router();

const PLANS = {
  month: { name: '月度订阅', amount: 2900, days: 30 },
  quarter: { name: '季度订阅', amount: 7900, days: 90 }
};

/**
 * 子订单 id 生成（SUB000001）
 * @param {Array} list
 * @returns {string}
 */
function nextSubId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^SUB(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'SUB' + String(max + 1).padStart(6, '0');
}

/**
 * 子订单 startAt、expireAt：startAt = max(总订单.expireAt, paidAt)，expireAt = startAt + planDays
 */
function computeSubPeriod(masterOrder, paidAt, planDays) {
  const paidTime = paidAt instanceof Date ? paidAt.getTime() : new Date(paidAt).getTime();
  let baseTime = paidTime;
  if (masterOrder && masterOrder.expireAt) {
    const prevEnd = new Date(masterOrder.expireAt).getTime();
    if (prevEnd > baseTime) baseTime = prevEnd;
  }
  const startAt = new Date(baseTime).toISOString();
  const expireAt = new Date(baseTime + planDays * 24 * 60 * 60 * 1000).toISOString();
  return { startAt, expireAt };
}

/** 用户列表：手机号筛选、分页，expireAt 来自总订单，subscriptionCount 为子订单数 */
router.get('/', async (req, res) => {
  try {
    const [users, orders, subscriptions] = await Promise.all([loadUsers(), loadOrders(), loadSubscriptions()]);
    const phone = (req.query.phone || '').trim().toLowerCase();
    let list = users.map(u => {
      const master = orders.find(o => o.userId === u.id);
      const expireAt = master && master.expireAt ? master.expireAt : null;
      const subscriptionCount = subscriptions.filter(s => s.userId === u.id).length;
      return {
        id: u.id,
        phone: u.phone,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        expireAt,
        subscriptionCount
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

/** 管理员为该用户续费：总订单不存在则创建，子订单 startAt = max(总订单.expireAt, 当前时间)，金额 0、支付人=管理员 */
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

    const [orders, list] = await Promise.all([loadOrders(), loadSubscriptions()]);
    let master = orders.find(o => o.userId === user.id);
    if (!master) {
      const masterId = nextOrderId(orders);
      const orderNo = nextOrderNo(orders);
      const iso = paidAt.toISOString();
      master = { id: masterId, orderNo, userId: user.id, expireAt: null, createdAt: iso, updatedAt: iso };
      orders.push(master);
      await saveOrders(orders);
    }
    const { startAt, expireAt } = computeSubPeriod(master, paidAt, config.days);
    const subId = nextSubId(list);
    const iso = paidAt.toISOString();
    const sub = {
      id: subId,
      orderId: master.id,
      userId: user.id,
      startAt,
      expireAt,
      plan,
      amount: 0,
      payStatus: 'paid',
      paidAt: iso,
      payer: '管理员',
      createdAt: iso,
      wxTransactionId: null
    };
    list.push(sub);
    const oIdx = orders.findIndex(o => o.userId === user.id);
    if (oIdx >= 0) {
      orders[oIdx] = { ...orders[oIdx], expireAt, updatedAt: iso };
    }
    await Promise.all([saveOrders(orders), saveSubscriptions(list)]);

    res.status(201).json({
      success: true,
      data: sub,
      message: '续费成功'
    });
  } catch (e) {
    console.error('❌ 管理端续费失败:', e);
    res.status(500).json({ success: false, message: e.message || '续费失败' });
  }
});

export default router;
