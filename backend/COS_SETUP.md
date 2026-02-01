# 腾讯云 COS 配置说明（公寓管理图片/视频上传）

公寓管理中的「从本地上传图片」「从本地上传视频」会先上传到腾讯云对象存储 COS，再保存返回的访问地址到数据库。请按以下步骤配置。

## 需要您提供的参数

在项目根目录的 `.env` 文件中添加以下环境变量（或直接提供给我配置）：

| 参数名 | 说明 | 示例 |
|--------|------|------|
| **COS_SECRET_ID** | 腾讯云 API 密钥 ID（[控制台-访问管理-API密钥](https://console.cloud.tencent.com/cam/capi)） | `AKIDxxxxxxxxxxxx` |
| **COS_SECRET_KEY** | 腾讯云 API 密钥 Key（同上） | `xxxxxxxxxxxxxxxx` |
| **COS_BUCKET** | 存储桶名称（格式：桶名-APPID，[对象存储控制台](https://console.cloud.tencent.com/cos) 创建） | `mybucket-1234567890` |
| **COS_REGION** | 存储桶所在地域 | `ap-beijing`（北京） |
| **COS_DOMAIN**（可选） | 自定义加速域名。不填则使用默认域名 `https://<Bucket>.cos.<Region>.myqcloud.com/` | `https://cdn.example.com` |

## 获取方式简要说明

1. **SecretId / SecretKey**  
   登录 [腾讯云控制台](https://console.cloud.tencent.com/) → 访问管理 → [API 密钥](https://console.cloud.tencent.com/cam/capi) → 新建或使用已有密钥，复制 **SecretId** 和 **SecretKey**。

2. **Bucket 与 Region**  
   进入 [对象存储 COS](https://console.cloud.tencent.com/cos) → 创建存储桶 → 选择地域（如北京 `ap-beijing`）→ 创建后得到 **桶名称**。  
   桶名称格式一般为：`<自定义名称>-<APPID>`，例如 `rent-home-1234567890`。  
   **COS_BUCKET** 填该完整名称，**COS_REGION** 填该桶所在地域英文代码（如 `ap-beijing`）。

3. **COS_DOMAIN（可选）**  
   若已为桶绑定自定义域名或 CDN 加速域名，可在此填写（如 `https://your-cdn.com`），接口返回的图片/视频地址将使用该域名。不填则使用腾讯云默认域名。

## .env 示例

```env
PORT=3001
# 腾讯云 COS（公寓图片/视频上传）
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_BUCKET=你的桶名-APPID
COS_REGION=ap-beijing
# COS_DOMAIN=https://你的自定义域名.com
```

配置完成后重启后端服务，管理端上传图片/视频即可写入 COS 并保存访问地址。
