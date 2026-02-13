# 微信支付（APIv3）配置说明

## 1. 证书放置

将商户 API 证书解压后放到 backend 目录下 `apiclient_cert/` 中：

- `apiclient_key.pem` — 商户私钥（必选）
- `apiclient_cert.pem` — 商户证书（用于自动读取证书序列号，可选；若无法读取则需在 .env 中配置 WXPAY_SERIAL_NO）

该目录已在 `.gitignore` 中，不会提交到仓库。

## 2. 环境变量（.env）

在 `backend/.env` 中增加：

```env
# 微信支付（商户号、APIv3 密钥、小程序）
WXPAY_MCHID=你的商户号
WXPAY_APIV3_KEY=你的APIv3密钥（32位，商户平台「API安全」中设置）
WXPAY_APPID=小程序AppID（与 frontmini 一致）
WXPAY_APP_SECRET=小程序AppSecret（用于 code 换 openid）
WXPAY_NOTIFY_URL=https://你的域名/api/subscription/pay-notify
WXPAY_CERT_DIR=apiclient_cert
# 可选：若证书序列号无法自动读取，可手动设置（openssl x509 -in apiclient_cert.pem -noout -serial，去掉 serial= 和冒号）
# WXPAY_SERIAL_NO=证书序列号十六进制
```

- **WXPAY_NOTIFY_URL** 必须为 HTTPS、公网可访问，且与微信商户平台中配置的支付结果回调 URL 一致（或先在商户平台配置该 URL）。
- 未配置上述变量或证书缺失时，订阅仍使用「手动标记已支付」逻辑。

## 3. 商户平台配置

1. 登录 [微信支付商户平台](https://pay.weixin.qq.com/)。
2. **产品中心** → **开发配置** → **支付配置**：配置「支付授权目录」或「JSAPI 支付」等（按小程序要求）。
3. **产品中心** → **开发配置** → **回调 URL**：配置「支付结果通知」为 `https://你的域名/api/subscription/pay-notify`。

## 4. 流程说明

- **创建订单**：前端带 `plan` + `code`（wx.login 的 code）请求 `POST /api/subscription/create`；若配置正确，后端会调微信 JSAPI 下单并返回 `paymentParams`，前端用其调起 `wx.requestPayment`。
- **支付结果**：微信服务器会 POST 到 `WXPAY_NOTIFY_URL`；后端验签并解密密文后，将对应订单更新为已支付。
- **手动标记**：未配置微信支付或需要测试时，仍可使用 `POST /api/subscription/mark-paid` 传入订单号进行标记。

## 5. 证书序列号（可选）

若日志提示签名失败或 serial 相关错误，可手动设置证书序列号：

```bash
openssl x509 -in apiclient_cert/apiclient_cert.pem -noout -serial
```

将输出中的 `serial=XXXX` 去掉前缀和冒号后，填入 .env 的 `WXPAY_SERIAL_NO`。
