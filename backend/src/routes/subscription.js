/**
 * 订阅服务接口（支持微信支付 JSAPI + 手动标记）
 * POST /api/subscription/create  创建订单（月/季），可带 code 获取 paymentParams 调起支付
 * POST /api/subscription/pay-notify  微信支付异步回调（无需登录）
 * POST /api/subscription/mark-paid  手动标记订单已支付（开发用）
 * GET  /api/subscription/my  我的订单与订阅状态
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadSubscriptions, saveSubscriptions } from '../utils/userDataLoader.js';
import {
  loadConfig,
  isEnabled,
  getOpenid,
  createJsapiPrepay,
  buildPaymentParams,
  verifyNotifyAndDecrypt
} from '../utils/wechatPay.js';

const router = express.Router();

// 启动时加载微信支付配置
let wxPayReady = false;
try {
  const cfg = loadConfig();
  wxPayReady = cfg.enabled;
  if (!wxPayReady && cfg.message) console.log('[微信支付]', cfg.message);
  else if (wxPayReady) console.log('[微信支付] 已启用，将使用 JSAPI 下单');
} catch (e) {
  console.warn('[微信支付] 加载配置失败', e.message);
}

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

/**
 * 计算续费后的到期时间
 * 若用户已有未过期或尚未结束的订阅，从最晚到期日累加；否则从支付时间起算
 * @param {Array} list - 所有订阅订单
 * @param {string} userId - 用户 ID
 * @param {string} currentOrderId - 当前处理的订单 ID（排除）
 * @param {Date} paidAt - 支付时间
 * @param {number} planDays - 套餐天数
 * @returns {string} ISO 格式的 expireAt
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

/** 创建订阅订单（可选传 code，启用微信支付时返回 paymentParams 供小程序调起支付） */
router.post('/create', requireAuth, async (req, res) => {
  const plan = (req.body && req.body.plan) ? String(req.body.plan).toLowerCase() : '';
  const code = (req.body && req.body.code) ? String(req.body.code).trim() : '';
  if (plan !== 'month' && plan !== 'quarter') {
    return res.status(400).json({
      success: false,
      message: '请选择套餐：month（月付）或 quarter（季付）'
    });
  }
  const config = PLANS[plan];
  try {
    let openid = null;
    if (wxPayReady && isEnabled() && code) {
      const openidRes = await getOpenid(code);
      if (openidRes.openid) {
        openid = openidRes.openid;
      } else {
        return res.status(400).json({
          success: false,
          message: '获取微信登录态失败，请重试'
        });
      }
    }

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

    const data = {
      id: order.id,
      plan,
      planName: config.name,
      amount: config.amount,
      payStatus: 'pending'
    };

    if (wxPayReady && isEnabled() && openid) {
      try {
        const { prepay_id } = await createJsapiPrepay(id, config.amount, config.name, openid);
        data.paymentParams = buildPaymentParams(prepay_id);
        data.message = '订单已创建，请完成支付';
      } catch (payErr) {
        console.error('微信下单失败:', payErr);
        data.message = '订单已创建，但获取支付参数失败，请稍后重试或使用手动标记';
      }
    } else {
      data.message = '订单已创建，请完成支付（当前为手动标记，管理员可在后台标记为已支付）';
    }

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({
      success: false,
      message: '创建订单失败'
    });
  }
});

/** 微信支付异步回调（验签后更新订单为已支付，依赖全局 express.json 的 verify 保留 req.rawBody） */
router.post('/pay-notify', async (req, res) => {
  if (!wxPayReady || !isEnabled()) {
    return res.status(500).json({ code: 'FAIL', message: '微信支付未配置' });
  }
  let event;
  try {
    event = await verifyNotifyAndDecrypt(req);
  } catch (e) {
    console.error('支付回调验签/解密失败:', e);
    return res.status(500).json({ code: 'FAIL', message: '验签失败' });
  }
  if (!event || event.trade_state !== 'SUCCESS') {
    return res.status(200).json({ code: 'SUCCESS', message: '成功' });
  }
  const { out_trade_no, transaction_id } = event;
  try {
    let list = await loadSubscriptions();
    const idx = list.findIndex(s => s.id === out_trade_no);
    if (idx === -1) {
      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    }
    const order = list[idx];
    if (order.payStatus === 'paid') {
      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    }
    const planConfig = PLANS[order.plan];
    if (!planConfig) {
      return res.status(200).json({ code: 'SUCCESS', message: '成功' });
    }
    const now = new Date();
    const paidAt = now.toISOString();
    const expireAt = computeNewExpireAt(list, order.userId, order.id, now, planConfig.days);
    list[idx] = {
      ...order,
      payStatus: 'paid',
      paidAt,
      expireAt,
      wxTransactionId: transaction_id,
      payer: '客户'
    };
    await saveSubscriptions(list);
    res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (e) {
    console.error('支付回调更新订单失败:', e);
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
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
    const expireAt = computeNewExpireAt(list, order.userId, order.id, now, config.days);
    list[idx] = {
      ...order,
      payStatus: 'paid',
      paidAt,
      expireAt,
      payer: '客户'
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
