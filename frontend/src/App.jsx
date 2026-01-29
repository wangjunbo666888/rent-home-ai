/**
 * 主应用组件
 * 租房匹配系统前端
 */
import { useState } from 'react';
import SearchForm from './components/SearchForm';
import ResultsList from './components/ResultsList';
import MapViewSafe from './components/MapViewSafe';
import './App.css';

function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState(null);

  /**
   * 处理搜索请求
   * @param {Object} params - 搜索参数 { workAddress, commuteTime, budget }
   */
  const handleSearch = async (params) => {
    setLoading(true);
    setError(null);
    setSearchParams(params);

    try {
      const response = await fetch('http://localhost:3001/api/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      if (data.success) {
        const list = Array.isArray(data.data) ? data.data : [];
        setResults(list);
      } else {
        console.error('❌ 匹配失败:', data.message);
        setError(data.message || '匹配失败，请重试');
        setResults([]);
      }
    } catch (err) {
      console.error('❌ 网络错误:', err);
      setError('网络错误，请检查后端服务是否运行: ' + err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏠 智能租房匹配系统</h1>
        <p>根据上班地点、通勤时长和预算，智能匹配最适合的公寓</p>
      </header>

      <main className="app-main">
        <div className="search-section">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            🔄 正在匹配中，请稍候...
          </div>
        )}

        {results.length > 0 ? (
          <div className="results-section">
            <div className="results-header">
              <h2>找到 {results.length} 个符合条件的公寓</h2>
              {searchParams && (
                <div className="search-summary">
                  <span>上班地址：{searchParams.workAddress}</span>
                  <span>通勤时长：≤{searchParams.commuteTime}分钟</span>
                  <span>预算：≤{searchParams.budget}元</span>
                </div>
              )}
            </div>
            <div className="results-content">
              <div className="results-list-wrap">
                <ResultsList results={results} />
              </div>
              <div className="results-map">
                <MapViewSafe results={results} workAddress={searchParams?.workAddress} />
              </div>
            </div>
          </div>
        ) : !loading && searchParams ? (
          <div className="empty-state">
            <p>⚠️ 未找到符合条件的公寓，请调整搜索条件</p>
          </div>
        ) : null}

        {!loading && results.length === 0 && !error && !searchParams && (
          <div className="empty-state">
            <p>👆 请输入您的租房需求，系统将为您匹配最合适的公寓</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
