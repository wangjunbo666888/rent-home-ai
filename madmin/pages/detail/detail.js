/**
 * 公寓详情页：只读展示，支持预览/下载图片、下载视频，入口到编辑
 */
const api = require('../../utils/api.js');
const media = require('../../utils/media.js');

Page({
  data: {
    id: '',
    data: null,
    loading: true,
    error: null,
    images: [],
    videos: []
  },

  onLoad(options) {
    const id = (options && options.id) || '';
    if (!id) {
      this.setData({ loading: false, error: '缺少公寓 ID' });
      return;
    }
    this.setData({ id });
    this.fetchDetail(id);
  },

  async fetchDetail(id) {
    this.setData({ loading: true, error: null });
    try {
      const res = await api.getApartmentDetail(id);
      const data = res.data || null;
      const images = (data && Array.isArray(data.images)) ? data.images : [];
      const videos = (data && Array.isArray(data.videos)) ? data.videos : [];
      this.setData({ data, images, videos, loading: false });
    } catch (e) {
      this.setData({
        loading: false,
        error: e.message || '加载失败',
        data: null,
        images: [],
        videos: []
      });
    }
  },

  /** 返回列表 */
  onBack() {
    wx.navigateBack();
  },

  /** 跳转编辑 */
  onEdit() {
    const id = this.data.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/form/form?id=${id}` });
  },

  /** 预览图片 */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const list = (this.data.images || []).map(img => img.url).filter(Boolean);
    if (!url) return;
    wx.previewImage({ current: url, urls: list.length ? list : [url] });
  },

  /** 下载图片（保存到相册） */
  onDownloadImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    media.downloadImage(url, 'save');
  },

  /** 下载视频（保存到相册） */
  onDownloadVideo(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    media.downloadVideo(url, 'save');
  }
});
