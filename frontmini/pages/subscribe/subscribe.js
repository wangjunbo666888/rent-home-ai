/**
 * 订阅页：选择月/季套餐，创建订单，手动标记已支付
 */
const api = require('../../utils/api.js');

Page({
  data: {
    selectedPlan: 'month',
    loading: false,
    marking: false,
    createResult: null,
    pendingOrderId: ''
  },

  onSelectPlan(e) {
    const plan = e.currentTarget.dataset.plan;
    if (plan) this.setData({ selectedPlan: plan });
  },

  /** 创建订单 */
  async onCreateOrder() {
    const { selectedPlan } = this.data;
    if (!selectedPlan) {
      wx.showToast({ title: '请选择套餐', icon: 'none' });
      return;
    }
    this.setData({ loading: true, createResult: null });
    try {
      const res = await api.createOrder(selectedPlan);
      const data = res && res.data ? res.data : null;
      if (data && data.id) {
        this.setData({
          createResult: data,
          pendingOrderId: data.id,
          loading: false
        });
        wx.showToast({ title: '订单已创建', icon: 'success' });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: res.message || '创建失败', icon: 'none' });
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({
        title: (err && err.message) ? err.message : '创建失败',
        icon: 'none'
      });
    }
  },

  /** 手动标记订单已支付 */
  async onMarkPaid() {
    const { pendingOrderId } = this.data;
    if (!pendingOrderId) {
      wx.showToast({ title: '请先创建订单', icon: 'none' });
      return;
    }
    this.setData({ marking: true });
    try {
      await api.markOrderPaid(pendingOrderId);
      wx.showToast({ title: '已开通', icon: 'success' });
      this.setData({
        createResult: null,
        pendingOrderId: '',
        marking: false
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      this.setData({ marking: false });
      wx.showToast({
        title: (err && err.message) ? err.message : '操作失败',
        icon: 'none'
      });
    }
  }
});
