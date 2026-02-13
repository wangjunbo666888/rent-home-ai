/**
 * 总订单数据加载
 * data/orders.json：总订单（一用户一单，含 orderNo、userId、expireAt）
 * @module utils/orderDataLoader
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ORDERS_FILE = path.join(__dirname, '../../../data/orders.json');

/**
 * 加载总订单列表
 * @returns {Promise<Array<{ id: string, orderNo: string, userId: string, expireAt: string|null, createdAt: string, updatedAt: string }>>}
 */
export async function loadOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8').trim();
    if (!data) return [];
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.error('加载总订单失败:', error);
    throw error;
  }
}

/**
 * 保存总订单列表
 * @param {Array} orders
 * @returns {Promise<void>}
 */
export async function saveOrders(orders) {
  try {
    if (!Array.isArray(orders)) {
      throw new Error('总订单数据格式错误：应为数组');
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (error) {
    console.error('保存总订单失败:', error);
    throw error;
  }
}

/**
 * 生成总订单 id（ORD000001）
 * @param {Array} list
 * @returns {string}
 */
export function nextOrderId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^ORD(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'ORD' + String(max + 1).padStart(6, '0');
}

/**
 * 生成总订单号 orderNo：SO + yyyyMMdd + 4 位序号（当日唯一）
 * @param {Array} list - 现有总订单列表
 * @returns {string}
 */
export function nextOrderNo(list) {
  const today = new Date();
  const prefix = 'SO' + [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('');
  const sameDay = list.filter(o => o.orderNo && o.orderNo.startsWith(prefix));
  let seq = 0;
  for (const o of sameDay) {
    const n = parseInt(o.orderNo.slice(prefix.length), 10);
    if (!Number.isNaN(n)) seq = Math.max(seq, n);
  }
  return prefix + String(seq + 1).padStart(4, '0');
}
