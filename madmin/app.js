/**
 * 公寓管理微信小程序入口
 * 与 frontadmin 功能一致，复用 backend 接口
 */
App({
  onLaunch() {
    // 可在此做登录、获取系统信息等
  },
  globalData: {
    /** 当前编辑/查看的公寓 ID，跨页传递 */
    currentApartmentId: null
  }
});
