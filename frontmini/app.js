/**
 * 智能租房匹配 - 微信小程序入口
 * 与 frontend 功能一致，复用 backend 接口
 */
App({
  onLaunch() {
    // 可在此做登录、获取系统信息等
  },
  globalData: {
    /** 匹配结果、搜索参数等跨页数据 */
    matchResults: null,
    searchParams: null,
    workLocation: null
  }
});
