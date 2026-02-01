/**
 * 结果页：展示匹配的公寓列表与地图
 * 数据来自首页跳转时传入的 state
 */
import { useLocation } from 'react-router-dom';
import ResultsList from '../components/ResultsList';
import MapViewSafe from '../components/MapViewSafe';
import '../App.css';
import './ResultsPage.css';

function ResultsPage() {
  const location = useLocation();
  const state = location.state || {};
  const results = state.results || [];
  const searchParams = state.searchParams || null;
  const workLocation = state.workLocation || null;
  const hasData = results.length > 0;

  return (
    <div className="app results-page">
      <header className="app-header results-page-header">
        <div className="results-page-header-inner">
          <div className="results-page-title-wrap">
            <h1>🏠 智能租房匹配系统</h1>
            <p>根据上班地点、通勤时长和预算，智能匹配最适合的公寓</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {!hasData ? (
          <div className="results-empty">
            <p>暂无匹配结果</p>
          </div>
        ) : (
          <>
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
                  <ResultsList results={results} searchParams={searchParams} />
                </div>
                <div className="results-map">
                  <MapViewSafe results={results} workAddress={searchParams?.workAddress} workLocation={workLocation} />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ResultsPage;
