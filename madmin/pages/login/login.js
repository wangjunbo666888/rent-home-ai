/**
 * 管理员登录页：用户名 + 密码
 */
const { post } = require('../../utils/request.js');
const config = require('../../config.js');

const TOKEN_KEY = 'adminToken';

Page({
  data: {
    username: '',
    password: '',
    loading: false,
    error: ''
  },

  onUsernameInput(e) {
    const v = (e.detail && e.detail.value) || '';
    this.setData({ username: v, error: '' });
  },

  onPasswordInput(e) {
    const v = (e.detail && e.detail.value) || '';
    this.setData({ password: v, error: '' });
  },

  /** 登录 */
  async onLogin() {
    const { username, password } = this.data;
    const u = (username || '').trim();
    const p = (password || '').trim();
    if (!u) {
      this.setData({ error: '请输入用户名' });
      return;
    }
    if (!p) {
      this.setData({ error: '请输入密码' });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      const url = (config.baseUrl || '') + '/api/admin/auth/login';
      const res = await new Promise((resolve, reject) => {
        wx.request({
          method: 'POST',
          url,
          data: { username: u, password: p },
          header: { 'Content-Type': 'application/json' },
          success(resp) {
            if (resp.statusCode >= 200 && resp.statusCode < 300) {
              resolve(resp.data);
            } else {
              const msg = (resp.data && resp.data.message) || `请求失败 ${resp.statusCode}`;
              reject(new Error(msg));
            }
          },
          fail: reject
        });
      });

      if (res && res.success && res.token) {
        wx.setStorageSync(TOKEN_KEY, res.token);
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.reLaunch({ url: '/pages/list/list' });
      } else {
        this.setData({ error: (res && res.message) || '登录失败' });
      }
    } catch (err) {
      this.setData({
        error: (err && err.message) ? err.message : '登录失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
