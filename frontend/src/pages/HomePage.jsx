/**
 * 首页：用户输入租房需求
 * 提交后跳转到结果页并携带匹配结果
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import '../App.css';

function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 处理搜索请求，请求成功后跳转到结果页并传递数据
   * @param {Object} params - 搜索参数 { workAddress, commuteTime, budget }
   */
  const handleSearch = async (params) => {
    setLoading(true);
    setError(null);

    try {
      //const response = await fetch('https://api.supeimofang.cn/api/match', {
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
        navigate('/results', {
          state: {
            results: list,
            searchParams: params,
            workLocation: data.workLocation || null,
          },
        });
      } else {
        setError(data.message || '匹配失败，请重试');
      }
    } catch (err) {
      console.error('❌ 网络错误:', err);
      setError('网络错误，请检查后端服务是否运行: ' + err.message);
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

        {!loading && !error && (
          <div className="empty-state">
            <p>👆 请输入您的租房需求，系统将为您匹配最合适的公寓</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default HomePage;
