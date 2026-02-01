/**
 * 腾讯云 COS 上传工具
 * 需在 .env 中配置：COS_SECRET_ID、COS_SECRET_KEY、COS_BUCKET、COS_REGION
 * 可选：COS_DOMAIN（自定义域名，不填则用默认 Bucket 域名）
 */
import COS from 'cos-nodejs-sdk-v5';
import path from 'path';

const SecretId = process.env.COS_SECRET_ID;
const SecretKey = process.env.COS_SECRET_KEY;
const Bucket = process.env.COS_BUCKET;
const Region = process.env.COS_REGION || 'ap-beijing';
const Domain = process.env.COS_DOMAIN || ''; // 自定义域名，如 https://cdn.example.com

const cos = SecretId && SecretKey
  ? new COS({ SecretId, SecretKey })
  : null;

/**
 * 上传 Buffer 到 COS
 * @param {Buffer} buffer - 文件内容
 * @param {string} originalName - 原始文件名（用于扩展名）
 * @param {string} prefix - 对象前缀，如 'apartments/images/' 或 'apartments/videos/'
 * @returns {Promise<{ url: string }>} 返回访问地址
 */
export async function uploadToCos(buffer, originalName, prefix = 'apartments/') {
  if (!cos || !Bucket) {
    throw new Error('腾讯云 COS 未配置，请在 .env 中设置 COS_SECRET_ID、COS_SECRET_KEY、COS_BUCKET、COS_REGION');
  }
  const ext = path.extname(originalName) || '.bin';
  const key = prefix + Date.now() + '-' + Math.random().toString(36).slice(2) + ext;

  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket,
        Region,
        Key: key,
        Body: buffer,
        ContentLength: buffer.length
      },
      (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        let url;
        if (Domain) {
          url = Domain.replace(/\/$/, '') + '/' + key;
        } else {
          url = `https://${Bucket}.cos.${Region}.myqcloud.com/${key}`;
        }
        resolve({ url });
      }
    );
  });
}
