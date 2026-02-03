/**
 * 公寓图片/视频下载与预览
 * @module utils/media
 */

/**
 * 下载图片并预览（或保存到相册）
 * @param {string} url - 图片 URL
 * @param {string} action - 'preview' | 'save'
 */
function downloadImage(url, action = 'preview') {
  if (!url) {
    wx.showToast({ title: '地址无效', icon: 'none' });
    return Promise.reject(new Error('url empty'));
  }
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success(res) {
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          reject(new Error('download fail'));
          return;
        }
        const tempPath = res.tempFilePath;
        if (action === 'preview') {
          wx.previewImage({ current: tempPath, urls: [tempPath] });
          resolve(tempPath);
        } else {
          wx.saveImageToPhotosAlbum({
            filePath: tempPath,
            success() {
              wx.showToast({ title: '已保存到相册', icon: 'success' });
              resolve(tempPath);
            },
            fail(err) {
              if (err.errMsg && err.errMsg.indexOf('auth') !== -1) {
                wx.showModal({
                  title: '提示',
                  content: '需要您授权保存图片到相册',
                  confirmText: '去设置',
                  success(s) {
                    if (s.confirm) wx.openSetting();
                  }
                });
              } else {
                wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' });
              }
              reject(err);
            }
          });
        }
      },
      fail(err) {
        wx.showToast({ title: '下载失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

/**
 * 下载视频到临时文件，然后保存到相册或打开
 * @param {string} url - 视频 URL
 * @param {string} action - 'save' | 'open'
 */
function downloadVideo(url, action = 'save') {
  if (!url) {
    wx.showToast({ title: '地址无效', icon: 'none' });
    return Promise.reject(new Error('url empty'));
  }
  wx.showLoading({ title: '下载中...' });
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success(res) {
        wx.hideLoading();
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          reject(new Error('download fail'));
          return;
        }
        const tempPath = res.tempFilePath;
        if (action === 'open') {
          wx.openDocument({
            filePath: tempPath,
            fileType: 'mp4',
            success() { resolve(tempPath); },
            fail(err) {
              wx.showToast({ title: err.errMsg || '打开失败', icon: 'none' });
              reject(err);
            }
          });
          return;
        }
        wx.saveVideoToPhotosAlbum({
          filePath: tempPath,
          success() {
            wx.showToast({ title: '已保存到相册', icon: 'success' });
            resolve(tempPath);
          },
          fail(err) {
            if (err.errMsg && err.errMsg.indexOf('auth') !== -1) {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存视频到相册',
                confirmText: '去设置',
                success(s) {
                  if (s.confirm) wx.openSetting();
                }
              });
            } else {
              wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' });
            }
            reject(err);
          }
        });
      },
      fail(err) {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = { downloadImage, downloadVideo };
