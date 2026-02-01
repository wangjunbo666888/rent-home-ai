/**
 * 搜索表单组件
 * 用于输入租房需求：上班地址（带联想）、通勤时长、预算
 */
import { useState, useRef, useEffect } from 'react';
import './SearchForm.css';

const SUGGESTION_API = 'http://localhost:3001/api/suggestion';
const DEBOUNCE_MS = 300;
const REGION = '北京市';

function SearchForm({ onSearch, loading }) {
  const [workAddress, setWorkAddress] = useState('');
  const [commuteTime, setCommuteTime] = useState(60);
  const [budget, setBudget] = useState(3000);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const debounceRef = useRef(null);

  /** 请求联想列表（防抖在调用方） */
  const fetchSuggestions = async (keyword) => {
    if (!keyword || !keyword.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionLoading(true);
    try {
      const url = `${SUGGESTION_API}?keyword=${encodeURIComponent(keyword.trim())}&region=${encodeURIComponent(REGION)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSuggestions(json.data);
        setSuggestionOpen(true);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      console.warn('联想请求失败:', e);
      setSuggestions([]);
    } finally {
      setSuggestionLoading(false);
    }
  };

  /** 上班地址输入变化：防抖后请求联想 */
  const handleWorkAddressChange = (e) => {
    const value = e.target.value;
    setWorkAddress(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setSuggestionOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, DEBOUNCE_MS);
  };

  /** 选择一条联想：填入完整地址并关闭下拉 */
  const handleSelectSuggestion = (item) => {
    const full = (item.address && item.address.trim()) ? item.address.trim() : (item.title || '').trim();
    if (full) setWorkAddress(full);
    setSuggestions([]);
    setSuggestionOpen(false);
  };

  /** 失焦延迟关闭下拉，便于点击选项 */
  const handleWorkAddressBlur = () => {
    setTimeout(() => setSuggestionOpen(false), 200);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
      <div className="form-group form-group-address">
        <label htmlFor="workAddress">
          📍 上班地址 <span className="required">*</span>
        </label>
        <div className="address-input-wrap">
          <input
            type="text"
            id="workAddress"
            value={workAddress}
            onChange={handleWorkAddressChange}
            onFocus={() => suggestions.length > 0 && setSuggestionOpen(true)}
            onBlur={handleWorkAddressBlur}
            placeholder="例如：亮马河、国贸大厦"
            required
            disabled={loading}
            autoComplete="off"
          />
          {suggestionLoading && <span className="address-loading">加载中...</span>}
          {suggestionOpen && suggestions.length > 0 && (
            <ul className="address-suggestion-list" role="listbox">
              {suggestions.map((item) => (
                <li
                  key={item.id || item.title + (item.address || '')}
                  className="address-suggestion-item"
                  role="option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(item);
                  }}
                >
                  <span className="suggestion-title">{item.title || '未知'}</span>
                  {item.address && (
                    <span className="suggestion-address">{item.address}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <small>输入关键词后可选择联想地址，以便准确计算通勤时间</small>
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
