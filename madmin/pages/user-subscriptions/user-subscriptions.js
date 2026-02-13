/**
 * 某用户的购买记录页：展示该用户全部订阅订单
 */
const api = require('../../utils/api.js');

/** 格式化为本地时间 YYYY-MM-DD HH:mm（后端存 UTC，这里转成本地时间显示） */
function formatDateTime(iso) {
  if (!iso || typeof iso !== 'string') return '-';
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${M}-${day} ${h}:${m}`;
}

Page({
  data: {
    user: null,
    list: [],
    loading: true,
    error: null
  },

  onLoad(options) {
    const userId = options.userId;
    if (!userId) {
      this.setData({ loading: false, error: '缺少用户参数' });
      return;
    }
    this.setData({ userId });
    this.fetchSubscriptions(userId);
  },

  async fetchSubscriptions(userId) {
    this.setData({ loading: true, error: null });
    try {
      const res = await api.getAdminUserSubscriptions(userId);
      const data = res.data || {};
      const rawList = Array.isArray(data.list) ? data.list : [];
      const list = rawList.map(item => ({
        ...item,
        paidAtText: formatDateTime(item.paidAt),
        expireAtText: formatDateTime(item.expireAt),
        amountYuan: item.amount != null ? (Number(item.amount) / 100).toFixed(2) : '-',
        payerText: item.payer || '客户'
      }));
      this.setData({
        user: data.user || null,
        list,
        loading: false
      });
    } catch (e) {
      console.error('[user-subscriptions] 失败', e);
      this.setData({
        loading: false,
        error: e.message || '加载失败',
        list: [],
        user: null
      });
    }
  },

  /** 套餐文案 */
  planName(plan) {
    return plan === 'quarter' ? '季度' : plan === 'month' ? '月度' : plan || '-';
  }
});
