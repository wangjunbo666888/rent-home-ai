/**
 * 人员管理页：手机号注册用户列表，按手机号查询、分页，购买记录链接、续费入口
 */
const api = require('../../utils/api.js');

const PAGE_SIZE = 10;

/** 格式化为本地时间 YYYY-MM-DD HH:mm（ISO 为 UTC，需转成本地） */
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
    list: [],
    loading: true,
    error: null,
    searchPhone: '',
    currentPage: 1,
    totalPages: 1,
    total: 0,
    pageSize: PAGE_SIZE
  },

  /** 是否首次显示，避免 onLoad 与 onShow 重复请求 */
  _isFirstShow: true,

  onLoad() {
    this.fetchList();
  },

  onShow() {
    if (this._isFirstShow) {
      this._isFirstShow = false;
      return;
    }
    this.fetchList();
  },

  onPullDownRefresh() {
    this.fetchList().then(() => wx.stopPullDownRefresh()).catch(() => wx.stopPullDownRefresh());
  },

  /**
   * 拉取用户列表（服务端分页）
   */
  async fetchList() {
    this.setData({ loading: true, error: null });
    try {
      const { searchPhone, currentPage, pageSize } = this.data;
      const res = await api.getAdminUserList({
        phone: searchPhone || undefined,
        page: currentPage,
        pageSize
      });
      const rawList = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      const list = rawList.map(item => ({
        ...item,
        createdAtText: formatDateTime(item.createdAt),
        expireAtText: formatDateTime(item.expireAt)
      }));
      const total = res.total != null ? res.total : rawList.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      this.setData({
        list,
        total,
        totalPages,
        loading: false
      });
    } catch (e) {
      console.error('[user-list] fetchList 失败', e);
      this.setData({
        loading: false,
        error: e.message || '加载失败',
        list: [],
        total: 0,
        totalPages: 1
      });
    }
  },

  onSearchPhoneInput(e) {
    this.setData({ searchPhone: (e.detail && e.detail.value) || '' });
  },

  /** 点击查询 */
  onSearch() {
    this.setData({ currentPage: 1 }, () => this.fetchList());
  },

  onResetSearch() {
    this.setData({ searchPhone: '', currentPage: 1 }, () => this.fetchList());
  },

  goFirst() {
    this.setData({ currentPage: 1 }, () => this.fetchList());
  },

  goPrev() {
    const { currentPage } = this.data;
    if (currentPage <= 1) return;
    this.setData({ currentPage: currentPage - 1 }, () => this.fetchList());
  },

  goNext() {
    const { currentPage, totalPages } = this.data;
    if (currentPage >= totalPages) return;
    this.setData({ currentPage: currentPage + 1 }, () => this.fetchList());
  },

  /**
   * 跳转购买记录
   */
  onPurchaseRecord(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/user-subscriptions/user-subscriptions?userId=${id}` });
  },

  /**
   * 跳转续费
   */
  onRenew(e) {
    const id = e.currentTarget.dataset.id;
    const phone = e.currentTarget.dataset.phone || '';
    if (!id) return;
    const query = `userId=${encodeURIComponent(id)}`;
    const phoneParam = phone ? `&phone=${encodeURIComponent(phone)}` : '';
    wx.navigateTo({ url: `/pages/renew/renew?${query}${phoneParam}` });
  }
});
