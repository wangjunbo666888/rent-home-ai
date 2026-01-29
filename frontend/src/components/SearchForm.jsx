/**
 * 搜索表单组件
 * 用于输入租房需求：上班地址、通勤时长、预算
 */
import { useState } from 'react';
import './SearchForm.css';

function SearchForm({ onSearch, loading }) {
  const [workAddress, setWorkAddress] = useState('');
  const [commuteTime, setCommuteTime] = useState(60);
  const [budget, setBudget] = useState(3000);

  /**
   * 处理表单提交
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!workAddress.trim()) {
      alert('请输入上班地址');
      return;
    }

    onSearch({
      workAddress: workAddress.trim(),
      commuteTime: parseInt(commuteTime),
      budget: parseInt(budget),
    });
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="workAddress">
          📍 上班地址 <span className="required">*</span>
        </label>
        <input
          type="text"
          id="workAddress"
          value={workAddress}
          onChange={(e) => setWorkAddress(e.target.value)}
          placeholder="例如：北京市朝阳区建国门外大街1号国贸大厦"
          required
          disabled={loading}
        />
        <small>请输入完整的公司地址，以便准确计算通勤时间</small>
      </div>

      <div className="form-group">
        <label htmlFor="commuteTime">
          ⏱️ 最大通勤时长（分钟）
        </label>
        <input
          type="number"
          id="commuteTime"
          value={commuteTime}
          onChange={(e) => setCommuteTime(e.target.value)}
          min="10"
          max="120"
          step="5"
          required
          disabled={loading}
        />
        <small>系统将筛选通勤时间不超过此时长的公寓</small>
      </div>

      <div className="form-group">
        <label htmlFor="budget">
          💰 预算（元/月）
        </label>
        <input
          type="number"
          id="budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          min="1000"
          max="10000"
          step="100"
          required
          disabled={loading}
        />
        <small>系统将筛选价格不超过此预算的公寓</small>
      </div>

      <button 
        type="submit" 
        className="search-button"
        disabled={loading || !workAddress.trim()}
      >
        {loading ? '匹配中...' : '🔍 开始匹配'}
      </button>
    </form>
  );
}

export default SearchForm;
