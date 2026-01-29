/**
 * 数据加载工具
 * 从JSON文件加载公寓数据
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../../../data/apartments.json');

/**
 * 加载公寓数据
 * @returns {Promise<Array>} 公寓数据列表
 */
export async function loadApartments() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.warn('⚠️  公寓数据文件不存在，请先运行导入脚本');
      return [];
    }

    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const apartments = JSON.parse(data);

    // 数据验证
    if (!Array.isArray(apartments)) {
      throw new Error('公寓数据格式错误：应为数组');
    }

    return apartments;
  } catch (error) {
    console.error('加载公寓数据失败:', error);
    throw error;
  }
}
