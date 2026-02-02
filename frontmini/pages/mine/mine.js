/**
 * 我的：个人中心页（当前为假数据展示）
 */
Page({
  data: {
    /** 假数据：后续可替换为真实用户信息 */
    user: {
      nickname: '租房小助手',
      phone: '138****8888',
      avatar: ''
    },
    /** 可扩展的假数据项 */
    extraItems: [
      { label: '常看区域', value: '朝阳区' },
      { label: '偏好户型', value: '一居室' }
    ]
  }
});
