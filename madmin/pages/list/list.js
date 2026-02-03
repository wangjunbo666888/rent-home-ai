/**
 * 公寓列表页：展示所有公寓，支持区域/名称搜索、分页、新增、查看、编辑、删除
 */
const api = require('../../utils/api.js');

const PAGE_SIZE = 10;

Page({
  data: {
    list: [],
    loading: true,
    error: null,
    searchRegion: '',
    searchName: '',
    currentPage: 1,
    totalPages: 1,
    pageList: [],
    filteredList: [],
    pageSize: PAGE_SIZE,
    deletingId: null
  },

  /** 是否首次显示（避免 onLoad 与 onShow 重复请求） */
  _isFirstShow: true,

  onLoad() {
    this.fetchList();
  },

  onShow() {
    if (this._isFirstShow) {
      this._isFirstShow = false;
      return;
    }
    // 从详情/表单返回时重新拉取列表，保证看到最新数据
    this.fetchList();
  },

  onPullDownRefresh() {
    this.fetchList().then(() => wx.stopPullDownRefresh()).catch(() => wx.stopPullDownRefresh());
  },

  /**
   * 拉取公寓列表
   */
  async fetchList() {
    this.setData({ loading: true, error: null });
    try {
      const res = await api.getApartmentList();
      const list = (res && res.data && Array.isArray(res.data)) ? res.data : [];
      this.setData({ list, loading: false }, () => this.applyFilterAndPage());
    } catch (e) {
      this.setData({
        loading: false,
        error: e.message || '加载失败',
        list: []
      });
    }
  },

  /**
   * 根据搜索条件过滤并分页
   */
  applyFilterAndPage() {
    const list = this.data.list || [];
    const { searchRegion, searchName, currentPage } = this.data;
    const region = (searchRegion || '').trim();
    const name = (searchName || '').trim();
    const filtered = !region && !name
      ? list
      : list.filter(item => {
          const matchRegion = !region || (item.district || '').includes(region);
          const matchName = !name || (item.name || '').includes(name);
          return matchRegion && matchName;
        });
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageList = filtered.slice(start, start + PAGE_SIZE);
    this.setData({
      filteredList: filtered,
      totalPages,
      pageList
    });
  },

  onSearchRegionInput(e) {
    const searchRegion = (e.detail && e.detail.value) || '';
    this.setData({ searchRegion, currentPage: 1 }, () => this.applyFilterAndPage());
  },

  onSearchNameInput(e) {
    const searchName = (e.detail && e.detail.value) || '';
    this.setData({ searchName, currentPage: 1 }, () => this.applyFilterAndPage());
  },

  onResetSearch() {
    this.setData({ searchRegion: '', searchName: '', currentPage: 1 }, () => this.applyFilterAndPage());
  },

  goFirst() {
    this.setData({ currentPage: 1 }, () => this.applyFilterAndPage());
  },

  goPrev() {
    const { currentPage } = this.data;
    if (currentPage <= 1) return;
    this.setData({ currentPage: currentPage - 1 }, () => this.applyFilterAndPage());
  },

  goNext() {
    const { currentPage, totalPages } = this.data;
    if (currentPage >= totalPages) return;
    this.setData({ currentPage: currentPage + 1 }, () => this.applyFilterAndPage());
  },

  /**
   * 跳转新增
   */
  onAdd() {
    wx.navigateTo({ url: '/pages/form/form' });
  },

  /**
   * 跳转详情
   */
  onViewDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  /**
   * 跳转编辑
   */
  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/form/form?id=${id}` });
  },

  /**
   * 删除公寓
   */
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？`,
      success: (res) => {
        if (res.confirm) this.doDelete(id);
      }
    });
  },

  async doDelete(id) {
    this.setData({ deletingId: id });
    try {
      await api.deleteApartment(id);
      const list = (this.data.list || []).filter(item => item.id !== id);
      this.setData({ list, deletingId: null });
      this.applyFilterAndPage();
      wx.showToast({ title: '已删除', icon: 'success' });
    } catch (e) {
      this.setData({ deletingId: null });
      wx.showToast({ title: e.message || '删除失败', icon: 'none' });
    }
  }
});
