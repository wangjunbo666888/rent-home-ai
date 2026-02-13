/**
 * 一次性迁移：将旧版平铺 subscriptions 转为 总订单(orders.json) + 子订单(subscriptions.json)
 * 运行：node scripts/migrate-orders.js（在 backend 目录下）
 * 会覆盖 data/orders.json 和 data/subscriptions.json，请先备份。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function nextOrderId(list) {
  let max = 0;
  for (const item of list) {
    const m = /^ORD(\d+)$/i.exec(item.id);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'ORD' + String(max + 1).padStart(6, '0');
}

function nextOrderNo(list, datePrefix) {
  const sameDay = list.filter(o => o.orderNo && o.orderNo.startsWith(datePrefix));
  let seq = 0;
  for (const o of sameDay) {
    const n = parseInt(o.orderNo.slice(datePrefix.length), 10);
    if (!Number.isNaN(n)) seq = Math.max(seq, n);
  }
  return datePrefix + String(seq + 1).padStart(4, '0');
}

function main() {
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    console.log('未找到 data/subscriptions.json，无需迁移');
    process.exit(0);
  }
  const raw = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
  const oldSubs = Array.isArray(raw) ? raw : [];
  if (oldSubs.length === 0) {
    fs.writeFileSync(ORDERS_FILE, '[]', 'utf-8');
    console.log('无旧订单数据，已写入空 orders.json');
    process.exit(0);
  }

  const byUser = new Map();
  for (const s of oldSubs) {
    const uid = s.userId || '';
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(s);
  }

  const orders = [];
  const datePrefix = 'SO' + new Date().toISOString().slice(0, 10).replace(/-/g, '');

  for (const [userId, subs] of byUser) {
    const paid = subs.filter(s => s.payStatus === 'paid' && s.expireAt);
    const maxExpire = paid.length
      ? paid.reduce((m, s) => (new Date(s.expireAt) > new Date(m) ? s.expireAt : m), paid[0].expireAt)
      : null;
    const minCreated = subs.reduce((m, s) => (!m || s.createdAt < m ? s.createdAt : m), null);
    const id = nextOrderId(orders);
    const orderNo = nextOrderNo(orders, datePrefix);
    const now = new Date().toISOString();
    orders.push({
      id,
      orderNo,
      userId,
      expireAt: maxExpire,
      createdAt: minCreated || now,
      updatedAt: maxExpire || now
    });
  }

  const newSubs = [];
  for (const [userId, subs] of byUser) {
    const master = orders.find(o => o.userId === userId);
    if (!master) continue;
    for (const s of subs) {
      newSubs.push({
        id: s.id,
        orderId: master.id,
        userId: s.userId,
        startAt: s.payStatus === 'paid' && s.paidAt ? s.paidAt : null,
        expireAt: s.expireAt || null,
        payStatus: s.payStatus || 'pending',
        plan: s.plan,
        amount: s.amount != null ? s.amount : 0,
        payer: s.payer || (s.payStatus === 'paid' ? '客户' : null),
        paidAt: s.paidAt || null,
        createdAt: s.createdAt,
        wxTransactionId: s.wxTransactionId || null
      });
    }
  }

  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(newSubs, null, 2), 'utf-8');
  console.log('迁移完成：总订单', orders.length, '条，子订单', newSubs.length, '条');
}

main();
