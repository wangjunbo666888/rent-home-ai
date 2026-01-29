/**
 * Excel数据导入脚本
 * 将apartments.xlsx转换为apartments.json
 */
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 文件路径
const EXCEL_FILE = path.join(__dirname, '../data/apartments.xlsx');
const JSON_FILE = path.join(__dirname, '../data/apartments.json');

/**
 * 导入Excel数据并转换为JSON
 */
function importExcel() {
  try {
    // 检查Excel文件是否存在
    if (!fs.existsSync(EXCEL_FILE)) {
      console.error(`❌ Excel文件不存在: ${EXCEL_FILE}`);
      console.log('💡 请确保 apartments.xlsx 文件在 data/ 目录下');
      process.exit(1);
    }

    console.log('📖 正在读取Excel文件...');
    
    // 读取Excel文件
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetName = workbook.SheetNames[0]; // 读取第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`✅ 读取到 ${rawData.length} 条原始数据`);

    // 数据清洗和转换
    const apartments = rawData.map((row, index) => {
      // 根据Excel列名映射（根据你的Excel格式调整）
      const apartment = {
        id: row['公寓ID'] || row['公寓id'] || `APT${String(index + 1).padStart(4, '0')}`,
        name: row['公寓名称'] || row['公寓名字'] || '',
        minPrice: parseFloat(row['最低月租金']) || 0,
        maxPrice: parseFloat(row['最高月租金']) || parseFloat(row['最低月租金']) || 0,
        address: row['详细地址'] || row['地址'] || '',
        district: extractDistrict(row['详细地址'] || row['地址'] || ''),
        remarks: row['备注'] || row['说明'] || ''
      };

      // 数据验证
      if (!apartment.name || !apartment.address) {
        console.warn(`⚠️  第${index + 1}行数据不完整，已跳过`);
        return null;
      }

      return apartment;
    }).filter(item => item !== null); // 过滤掉空数据

    console.log(`✅ 清洗后有效数据: ${apartments.length} 条`);

    // 保存为JSON文件
    fs.writeFileSync(JSON_FILE, JSON.stringify(apartments, null, 2), 'utf-8');
    
    console.log(`✅ 数据已成功导入到: ${JSON_FILE}`);
    console.log(`📊 数据统计:`);
    console.log(`   - 总公寓数: ${apartments.length}`);
    console.log(`   - 价格范围: ${Math.min(...apartments.map(a => a.minPrice))} - ${Math.max(...apartments.map(a => a.maxPrice))} 元`);
    
    // 显示前3条数据作为示例
    console.log(`\n📋 前3条数据示例:`);
    apartments.slice(0, 3).forEach((apt, i) => {
      console.log(`   ${i + 1}. ${apt.name} - ${apt.minPrice}元 - ${apt.address}`);
    });

  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

/**
 * 从地址中提取区县信息
 * @param {string} address - 完整地址
 * @returns {string} 区县名称
 */
function extractDistrict(address) {
  const districts = ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', 
                     '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', 
                     '怀柔区', '平谷区', '密云区', '延庆区'];
  
  for (const district of districts) {
    if (address.includes(district)) {
      return district;
    }
  }
  
  return '未知';
}

// 执行导入
importExcel();
