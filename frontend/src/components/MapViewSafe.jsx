/**
 * 地图视图安全包装
 * 捕获 MapView 内错误，避免导致整页白屏
 */
import { Component } from 'react';
import MapView from './MapView';

class MapViewSafe extends Component {
  state = { hasError: false, errorMsg: '' };

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || '地图加载失败' };
  }

  componentDidCatch(error, info) {
    console.error('MapView 错误:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="map-view map-view-fallback" style={{
          minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f5f5f5', borderRadius: 12, color: '#666'
        }}>
          <span>地图加载失败，请刷新重试</span>
        </div>
      );
    }
    return <MapView {...this.props} />;
  }
}

export default MapViewSafe;
