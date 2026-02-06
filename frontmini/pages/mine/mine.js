/**
 * 我的：个人中心，展示登录状态与订阅状态，入口为订阅/续费
 */
const api = require('../../utils/api.js');
const { getToken } = require('../../utils/request.js');

Page({
  data: {
    loggedIn: false,
    user: null,
    subscriptionExpireAt: null,
    hasActiveSubscription: false,
    loading: true,
    orders: []
  },

  onShow() {
    this.checkLoginAndProfile();
  },

  /** 检查登录态并拉取用户信息与订阅状态 */
  async checkLoginAndProfile() {
    const token = getToken();
    if (!token) {
      this.setData({
        loggedIn: false,
        user: null,
        subscriptionExpireAt: null,
        hasActiveSubscription: false,
        loading: false,
        orders: []
      });
      return;
    }
    this.setData({ loading: true });
    try {
      const [profileRes, subRes] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getMySubscription().catch(() => null)
      ]);
      const profile = profileRes && profileRes.data ? profileRes.data : null;
      const subData = subRes && subRes.data ? subRes.data : null;
      const expireAt = (profile && profile.subscriptionExpireAt) || (subData && subData.subscriptionExpireAt) || null;
      const hasActive = !!(profile && profile.hasActiveSubscription) || !!(subData && subData.hasActiveSubscription);
      const orders = ((subData && subData.orders) || []).map(o => ({
        ...o,
        expireAtShort: o.expireAt ? o.expireAt.slice(0, 10) : ''
      }));
      const expireAtText = expireAt ? expireAt.slice(0, 10) : '';
      const phone = (profile && profile.phone) ? profile.phone : '';
      const phoneMasked = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '';
      const avatarText = phone ? phone.slice(-2) : '我';
      this.setData({
        loggedIn: true,
        user: profile ? { id: profile.id, phone, phoneMasked, avatarText } : { phone: '', phoneMasked: '', avatarText: '我' },
        subscriptionExpireAt: expireAtText,
        hasActiveSubscription: hasActive,
        orders,
        loading: false
      });
    } catch (e) {
      this.setData({
        loggedIn: false,
        user: null,
        subscriptionExpireAt: null,
        hasActiveSubscription: false,
        loading: false,
        orders: []
      });
    }
  },

  /** 去登录 */
  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  /** 订阅/续费 */
  goSubscribe() {
    wx.navigateTo({ url: '/pages/subscribe/subscribe' });
  },

  /** 退出登录：清空 token 并跳转到登录页 */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync('token');
        wx.reLaunch({ url: '/pages/login/login' });
      }
    });
  }
});
