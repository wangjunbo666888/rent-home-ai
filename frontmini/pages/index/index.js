/**
 * 首页：输入租房需求（上班地址、通勤时长、预算）
 * 提交后调用匹配接口并跳转结果页
 */
const api = require('../../utils/api.js');

Page({
  data: {
    workAddress: '',
    commuteTime: 60,
    budget: 3000,
    suggestions: [],
    suggestionOpen: false,
    suggestionLoading: false,
    loading: false,
    error: null
  },

  /** 防抖定时器 */
  _debounceTimer: null,

  /** 上班地址输入 */
  onWorkAddressInput(e) {
    const value = (e.detail && e.detail.value) || '';
    this.setData({ workAddress: value, error: null });
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (!value.trim()) {
      this.setData({ suggestions: [], suggestionOpen: false });
      return;
    }
    this._debounceTimer = setTimeout(() => {
      this.fetchSuggestions(value.trim());
    }, 300);
  },

  /**
   * 请求地址联想
   * @param {string} keyword
   */
  async fetchSuggestions(keyword) {
    if (!keyword) return;
    this.setData({ suggestionLoading: true });
    try {
      const res = await api.suggestion(keyword);
      const list = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      this.setData({
        suggestions: list,
        suggestionOpen: list.length > 0,
        suggestionLoading: false
      });
    } catch (e) {
      this.setData({ suggestions: [], suggestionOpen: false, suggestionLoading: false });
    }
  },

  /** 选择联想项 */
  onSelectSuggestion(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.suggestions || [];
    const item = list[index];
    if (!item) return;
    const full = (item.address && item.address.trim()) ? item.address.trim() : (item.title || '').trim();
    if (full) this.setData({ workAddress: full, suggestions: [], suggestionOpen: false });
  },

  /** 通勤时长 */
  onCommuteTimeChange(e) {
    const v = e.detail.value;
    const n = parseInt(v, 10);
    if (!isNaN(n)) this.setData({ commuteTime: Math.max(10, Math.min(120, n)) });
  },

  /** 预算 */
  onBudgetChange(e) {
    const v = e.detail.value;
    const n = parseInt(v, 10);
    if (!isNaN(n)) this.setData({ budget: Math.max(1000, Math.min(10000, n)) });
  },

  /** 开始匹配 */
  async onSearch() {
    const { workAddress, commuteTime, budget } = this.data;
    if (!workAddress || !workAddress.trim()) {
      wx.showToast({ title: '请输入上班地址', icon: 'none' });
      return;
    }
    this.setData({ loading: true, error: null });
    try {
      const res = await api.match({
        workAddress: workAddress.trim(),
        commuteTime: parseInt(commuteTime, 10) || 60,
        budget: parseInt(budget, 10) || 3000
      });
      const results = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      const workLocation = res && res.workLocation ? res.workLocation : null;
      const app = getApp();
      app.globalData.matchResults = results;
      app.globalData.searchParams = { workAddress: workAddress.trim(), commuteTime, budget };
      app.globalData.workLocation = workLocation;
      wx.navigateTo({ url: '/pages/results/results' });
    } catch (err) {
      const msg = (err && err.message) ? err.message : '网络错误，请检查后端服务';
      this.setData({ error: msg });
      wx.showToast({ title: msg, icon: 'none', duration: 2500 });
    } finally {
      this.setData({ loading: false });
    }
  }
});
