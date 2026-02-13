/**
 * 续费页：管理员为指定用户续费（无需真实支付，支付人=管理员，金额=0，支付时间=系统时间）
 */
const api = require('../../utils/api.js');

const PLANS = [
  { value: 'month', label: '月度（29元/30天）', amount: 2900 },
  { value: 'quarter', label: '季度（79元/90天）', amount: 7900 }
];

Page({
  data: {
    userId: '',
    userPhone: '',
    planIndex: 0,
    plans: PLANS,
    submitting: false,
    error: null
  },

  onLoad(options) {
    const userId = options.userId || '';
    const userPhone = options.phone || '';
    const defaultPlan = (options.plan || 'month').toLowerCase();
    const planIndex = PLANS.findIndex(p => p.value === defaultPlan);
    this.setData({
      userId,
      userPhone,
      planIndex: planIndex >= 0 ? planIndex : 0,
      error: null
    });
  },

  onPlanChange(e) {
    const idx = parseInt(e.detail.value, 10);
    this.setData({ planIndex: isNaN(idx) ? 0 : idx });
  },

  async onSubmit() {
    const { userId, planIndex, plans } = this.data;
    if (!userId) {
      wx.showToast({ title: '缺少用户参数', icon: 'none' });
      return;
    }
    const plan = plans[planIndex] ? plans[planIndex].value : 'month';
    this.setData({ submitting: true, error: null });
    try {
      await api.postAdminRenew(userId, { plan });
      this.setData({ submitting: false });
      wx.showToast({ title: '续费成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      this.setData({ submitting: false, error: e.message || '续费失败' });
      wx.showToast({ title: e.message || '续费失败', icon: 'none' });
    }
  }
});
