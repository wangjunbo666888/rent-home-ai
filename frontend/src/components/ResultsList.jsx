/**
 * 结果列表组件
 * 展示匹配到的公寓列表，支持跳转至媒体详情页查看图片与视频
 */
import { useNavigate } from 'react-router-dom';
import './ResultsList.css';

function ResultsList({ results, searchParams }) {
  const navigate = useNavigate();
  const list = Array.isArray(results) ? results : [];
  if (list.length === 0) {
    return (
      <div className="results-list">
        <p>暂无数据</p>
      </div>
    );
  }

  /**
   * 格式化价格显示
   */
  const formatPrice = (minPrice, maxPrice) => {
    if (!minPrice && !maxPrice) return '价格未知';
    if (minPrice === maxPrice) {
      return `${minPrice}元`;
    }
    return `${minPrice || '?'}-${maxPrice || '?'}元`;
  };

  /**
   * 格式化距离显示
   */
  const formatDistance = (distance) => {
    if (!distance) return '';
    if (distance < 1000) {
      return `${distance}米`;
    }
    return `${(distance / 1000).toFixed(1)}公里`;
  };

  return (
    <div className="results-list">
      {list.map((apartment, index) => {
        if (!apartment) {
          console.warn('⚠️ 发现空数据项，索引:', index);
          return null;
        }
        return (
          <div key={apartment.id || index} className="apartment-card">
            <div className="apartment-header">
              <h3 className="apartment-name">{apartment.name}</h3>
              <div className="apartment-badge">
                {index < 3 && <span className="top-badge">TOP {index + 1}</span>}
              </div>
            </div>

            <div className="apartment-info">
              <div className="info-row">
                <span className="info-label">💰 价格：</span>
                <span className="info-value price">{formatPrice(apartment.minPrice, apartment.maxPrice)}</span>
              </div>

              <div className="info-row">
                <span className="info-label">⏱️ 通勤：</span>
                <span className="info-value commute">
                  {apartment.commuteTime}分钟
                  {apartment.commuteDistance && (
                    <span className="distance">（{formatDistance(apartment.commuteDistance)}）</span>
                  )}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">📍 地址：</span>
                <span className="info-value address">{apartment.address}</span>
              </div>

              {apartment.district && (
                <div className="info-row">
                  <span className="info-label">🏘️ 区域：</span>
                  <span className="info-value">{apartment.district}</span>
                </div>
              )}

              {apartment.remarks && (
                <div className="info-row">
                  <span className="info-label">📝 备注：</span>
                  <span className="info-value remarks">{apartment.remarks}</span>
                </div>
              )}
            </div>

            {apartment.recommendation && (
              <div className="apartment-recommendation">
                <strong>💡 推荐理由：</strong>
                <p>{apartment.recommendation}</p>
              </div>
            )}

            {apartment.commuteRoute && apartment.commuteRoute !== '公共交通' && (
              <div className="apartment-route">
                <strong>🚇 路线：</strong>
                <span>{apartment.commuteRoute}</span>
              </div>
            )}

            <div className="apartment-media-entry">
              <button
                type="button"
                className="btn-view-media"
                onClick={() => navigate('/results/media', { state: { apartment, results, searchParams } })}
              >
                📷 查看图片与视频
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ResultsList;
