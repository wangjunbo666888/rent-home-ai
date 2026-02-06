/**
 * 登录页：手机号 + 验证码登录
 */
const api = require('../../utils/api.js');

const PHONE_REG = /^1\d{10}$/;

Page({
  data: {
    phone: '',
    code: '',
    sending: false,
    codeCountdown: 0,
    loading: false,
    error: ''
  },

  _countdownTimer: null,

  onPhoneInput(e) {
    const v = (e.detail && e.detail.value) || '';
    this.setData({ phone: v, error: '' });
  },

  onCodeInput(e) {
    const v = (e.detail && e.detail.value) || '';
    this.setData({ code: v, error: '' });
  },

  /** 发送验证码 */
  async onSendCode() {
    const { phone } = this.data;
    if (!PHONE_REG.test(phone)) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }
    this.setData({ sending: true, error: '' });
    try {
      await api.sendCode(phone);
      wx.showToast({ title: '验证码已发送', icon: 'none' });
      let countdown = 60;
      this.setData({ codeCountdown: countdown });
      this._countdownTimer = setInterval(() => {
        countdown--;
        this.setData({ codeCountdown: countdown });
        if (countdown <= 0 && this._countdownTimer) {
          clearInterval(this._countdownTimer);
          this._countdownTimer = null;
        }
      }, 1000);
    } catch (err) {
      this.setData({
        error: (err && err.message) ? err.message : '发送失败',
        sending: false
      });
    } finally {
      this.setData({ sending: false });
    }
  },

  /** 登录 */
  async onLogin() {
    const { phone, code } = this.data;
    if (!PHONE_REG.test(phone)) {
      this.setData({ error: '请输入正确的手机号' });
      return;
    }
    if (!code || code.length < 4) {
      this.setData({ error: '请输入验证码' });
      return;
    }
    this.setData({ loading: true, error: '' });
    try {
      const res = await api.login(phone, code);
      const token = res && res.token;
      const user = res && res.user;
      if (token) {
        wx.setStorageSync('token', token);
        wx.showToast({ title: '登录成功', icon: 'success' });
        const pages = getCurrentPages();
        if (pages.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/index/index' });
        }
      } else {
        this.setData({ error: '登录失败，请重试' });
      }
    } catch (err) {
      this.setData({
        error: (err && err.message) ? err.message : '登录失败',
        loading: false
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onUnload() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }
});
