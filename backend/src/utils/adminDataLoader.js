/**
 * 管理员数据加载工具
 * 从 data/admins.json 读写，与 users.json 分离
 * @module utils/adminDataLoader
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMINS_FILE = path.join(__dirname, '../../../data/admins.json');

/**
 * 加载管理员列表
 * @returns {Promise<Array>}
 */
export async function loadAdmins() {
  try {
    if (!fs.existsSync(ADMINS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(ADMINS_FILE, 'utf-8');
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('加载管理员数据失败:', error);
    throw error;
  }
}

/**
 * 保存管理员列表
 * @param {Array} admins
 * @returns {Promise<void>}
 */
export async function saveAdmins(admins) {
  try {
    if (!Array.isArray(admins)) {
      throw new Error('管理员数据格式错误：应为数组');
    }
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存管理员数据失败:', error);
    throw error;
  }
}
