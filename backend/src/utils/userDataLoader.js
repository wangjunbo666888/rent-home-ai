/**
 * 用户与订阅数据加载工具
 * 从 data/users.json、data/subscriptions.json 读写
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '../../../data/users.json');
const SUBSCRIPTIONS_FILE = path.join(__dirname, '../../../data/subscriptions.json');

/**
 * 加载用户列表
 * @returns {Promise<Array>}
 */
export async function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('加载用户数据失败:', error);
    throw error;
  }
}

/**
 * 保存用户列表
 * @param {Array} users
 * @returns {Promise<void>}
 */
export async function saveUsers(users) {
  try {
    if (!Array.isArray(users)) {
      throw new Error('用户数据格式错误：应为数组');
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存用户数据失败:', error);
    throw error;
  }
}

/**
 * 加载订阅/订单列表
 * @returns {Promise<Array>}
 */
export async function loadSubscriptions() {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('加载订阅数据失败:', error);
    throw error;
  }
}

/**
 * 保存订阅/订单列表
 * @param {Array} subscriptions
 * @returns {Promise<void>}
 */
export async function saveSubscriptions(subscriptions) {
  try {
    if (!Array.isArray(subscriptions)) {
      throw new Error('订阅数据格式错误：应为数组');
    }
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存订阅数据失败:', error);
    throw error;
  }
}
