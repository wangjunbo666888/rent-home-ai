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

  /** 通勤时长滑块（15–120 分钟） */
  onCommuteSliderChange(e) {
    const v = e.detail && e.detail.value;
    if (v !== undefined && v !== null) this.setData({ commuteTime: v });
  },

  /** 预算输入（允许清空、允许中间状态，不做实时范围限制避免闪烁） */
  onBudgetChange(e) {
    const v = (e.detail && e.detail.value) || '';
    if (v === '') {
      this.setData({ budget: '' });
      return;
    }
    const n = parseInt(v, 10);
    if (!isNaN(n)) this.setData({ budget: n });
    else this.setData({ budget: v });
  },

  /**
   * 校验并规整通勤时长与预算（提交时调用）
   * 通勤时长、预算不能为空；通勤 15-120 分钟（与滑块一致），预算 500-50000 元
   * @returns {{ commuteTime: number, budget: number } | null } 合法时返回规整后的值，非法时返回 null 并已弹窗
   */
  validateNumberInputs() {
    const { commuteTime, budget } = this.data;
    const COMMUTE_MIN = 15;
    const COMMUTE_MAX = 120;
    const BUDGET_MIN = 500;
    const BUDGET_MAX = 50000;

    const ct = parseInt(commuteTime, 10);
    if (commuteTime === '' || commuteTime === undefined || commuteTime === null || isNaN(ct)) {
      wx.showToast({ title: '请设置通勤时长', icon: 'none', duration: 2000 });
      return null;
    }
    if (budget === '' || budget === undefined || budget === null) {
      wx.showToast({ title: '请输入预算', icon: 'none', duration: 2000 });
      return null;
    }

    const bd = parseInt(budget, 10);

    if (ct < COMMUTE_MIN || ct > COMMUTE_MAX) {
      wx.showToast({
        title: `通勤时长请填写 ${COMMUTE_MIN}-${COMMUTE_MAX} 分钟`,
        icon: 'none',
        duration: 2500
      });
      return null;
    }
    if (isNaN(bd) || bd < BUDGET_MIN || bd > BUDGET_MAX) {
      wx.showToast({
        title: `预算请填写 ${BUDGET_MIN}-${BUDGET_MAX} 元`,
        icon: 'none',
        duration: 2500
      });
      return null;
    }

    const clampedCommute = Math.max(COMMUTE_MIN, Math.min(COMMUTE_MAX, ct));
    const clampedBudget = Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, bd));
    return { commuteTime: clampedCommute, budget: clampedBudget };
  },

  /** 开始匹配 */
  async onSearch() {
    const { workAddress } = this.data;
    if (!workAddress || !workAddress.trim()) {
      wx.showToast({ title: '请输入上班地址', icon: 'none' });
      return;
    }

    const validated = this.validateNumberInputs();
    if (!validated) return;

    const { commuteTime, budget } = validated;
    this.setData({ loading: true, error: null });
    try {
      const res = await api.match({
        workAddress: workAddress.trim(),
        commuteTime,
        budget
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
