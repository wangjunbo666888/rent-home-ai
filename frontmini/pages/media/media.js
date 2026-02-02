/**
 * 媒体详情页：展示指定公寓的图片与视频
 * 数据通过 eventChannel 从结果页传入
 */
Page({
  data: {
    apartment: null,
    activeTab: 'images',
    images: [],
    videos: []
  },

  onLoad() {
    const eventChannel = this.getOpenerEventChannel();
    eventChannel.on('apartment', (data) => {
      const apartment = data && data.apartment ? data.apartment : null;
      const images = Array.isArray(apartment && apartment.images) ? apartment.images : [];
      const videos = Array.isArray(apartment && apartment.videos) ? apartment.videos : [];
      this.setData({
        apartment,
        images,
        videos,
        activeTab: images.length > 0 ? 'images' : 'videos'
      });
    });
  },

  /** 切换 Tab：图片 / 视频 */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab) this.setData({ activeTab: tab });
  },

  /** 预览图片（小程序原生能力） */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const list = this.data.images.map(it => (it.url || it));
    if (!url || !list.length) return;
    wx.previewImage({
      current: url,
      urls: list
    });
  },

  /** 保存图片到相册 */
  onSaveImage(e) {
    const url = e.currentTarget.dataset.url;
    const name = e.currentTarget.dataset.name || '公寓图片';
    if (!url) return;
    wx.showLoading({ title: '保存中...' });
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail(err) {
            if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
              wx.showToast({ title: '请授权保存到相册', icon: 'none' });
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        });
      },
      fail() {
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
      complete() {
        wx.hideLoading();
      }
    });
  },

  /**
   * 保存视频到相册
   * @param {Object} e - 事件对象，e.currentTarget.dataset.url 为视频地址
   */
  onSaveVideo(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.showLoading({ title: '保存中...' });
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.saveVideoToPhotosAlbum({
          filePath: res.tempFilePath,
          success() {
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail(err) {
            if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
              wx.showToast({ title: '请授权保存到相册', icon: 'none' });
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        });
      },
      fail() {
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
      complete() {
        wx.hideLoading();
      }
    });
  }
});
