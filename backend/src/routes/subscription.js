/**
 * 订阅服务接口（当前为手动标记支付，未接微信支付）
 * POST /api/subscription/create  创建订单（月/季）
 * POST /api/subscription/mark-paid  手动标记订单已支付（订单号）
 * GET  /api/subscription/my  我的订单与订阅状态
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadSubscriptions, saveSubscriptions } from '../utils/userDataLoader.js';

const router = express.Router();

const PLANS = {
  month: { name: '月度订阅', amount: 2900, days: 30 },   // 29 元，30 天
  quarter: { name: '季度订阅', amount: 7900, days: 90 }  // 79 元，90 天
};

function nextOrderId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^SUB(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'SUB' + String(max + 1).padStart(6, '0');
}

/** 创建订阅订单 */
router.post('/create', requireAuth, async (req, res) => {
  const plan = (req.body && req.body.plan) ? String(req.body.plan).toLowerCase() : '';
  if (plan !== 'month' && plan !== 'quarter') {
    return res.status(400).json({
      success: false,
      message: '请选择套餐：month（月付）或 quarter（季付）'
    });
  }
  const config = PLANS[plan];
  try {
    let list = await loadSubscriptions();
    const id = nextOrderId(list);
    const now = new Date().toISOString();
    const order = {
      id,
      userId: req.user.id,
      plan,
      amount: config.amount,
      payStatus: 'pending',
      paidAt: null,
      expireAt: null,
      createdAt: now,
      wxTransactionId: null
    };
    list.push(order);
    await saveSubscriptions(list);
    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        plan,
        planName: config.name,
        amount: config.amount,
        payStatus: 'pending',
        message: '订单已创建，请完成支付（当前为手动标记，管理员可在后台标记为已支付）'
      }
    });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({
      success: false,
      message: '创建订单失败'
    });
  }
});

/** 手动标记订单已支付（开发/运营用，无权限校验时可加管理员鉴权） */
router.post('/mark-paid', requireAuth, async (req, res) => {
  const orderId = (req.body && req.body.orderId) ? String(req.body.orderId).trim() : '';
  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: '请传入 orderId'
    });
  }
  try {
    let list = await loadSubscriptions();
    const idx = list.findIndex(s => s.id === orderId);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }
    const order = list[idx];
    if (order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '只能标记自己的订单'
      });
    }
    if (order.payStatus === 'paid') {
      return res.json({
        success: true,
        data: order,
        message: '订单已是已支付状态'
      });
    }
    const config = PLANS[order.plan];
    if (!config) {
      return res.status(400).json({
        success: false,
        message: '无效套餐类型'
      });
    }
    const now = new Date();
    const paidAt = now.toISOString();
    const expireAt = new Date(now.getTime() + config.days * 24 * 60 * 60 * 1000).toISOString();
    list[idx] = {
      ...order,
      payStatus: 'paid',
      paidAt,
      expireAt
    };
    await saveSubscriptions(list);
    res.json({
      success: true,
      data: list[idx],
      message: '已标记为已支付，订阅已生效'
    });
  } catch (err) {
    console.error('标记支付失败:', err);
    res.status(500).json({
      success: false,
      message: '操作失败'
    });
  }
});

/** 我的订单与订阅状态 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const list = await loadSubscriptions();
    const myOrders = list
      .filter(s => s.userId === req.user.id)
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    const now = new Date().toISOString();
    const active = myOrders
      .filter(s => s.payStatus === 'paid' && s.expireAt > now)
      .sort((a, b) => (b.expireAt > a.expireAt ? 1 : -1));
    const expireAt = active.length > 0 ? active[0].expireAt : null;
    res.json({
      success: true,
      data: {
        subscriptionExpireAt: expireAt,
        hasActiveSubscription: !!expireAt,
        orders: myOrders
      }
    });
  } catch (err) {
    console.error('获取我的订阅失败:', err);
    res.status(500).json({
      success: false,
      message: '获取失败'
    });
  }
});

export default router;
