/**
 * 地图视图组件
 * 使用腾讯地图展示公寓位置和上班地点
 */
import { useEffect, useRef } from 'react';
import './MapView.css';

function MapView({ results, workAddress }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    function initMap() {
      try {
        if (!mapContainer.current || !window.TMap) return;

        // 创建地图实例
        if (!mapInstance.current) {
          mapInstance.current = new window.TMap.Map(mapContainer.current, {
            center: new window.TMap.LatLng(39.908823, 116.397470),
            zoom: 12,
          });
        }

        markersRef.current.forEach(marker => {
          try {
            if (marker && marker.destroy) marker.destroy();
          } catch (e) {}
        });
        markersRef.current = [];

        if (results.length === 0) return;

        const Geocoder = window.TMap?.service?.Geocoder || window.TMap?.Geocoder;
        if (!Geocoder) {
          console.warn('腾讯地图 Geocoder 不可用，跳过标记');
          return;
        }
        const geocoder = new Geocoder();

        if (workAddress) {
          geocoder.getLocation({
            address: workAddress,
            success: (result) => {
              if (cancelled || !mapInstance.current) return;
              try {
                if (result?.result?.location) {
                  const loc = result.result.location;
                  const marker = new window.TMap.Marker({
                    map: mapInstance.current,
                    position: new window.TMap.LatLng(loc.lat, loc.lng),
                  });
                  markersRef.current.push(marker);
                }
              } catch (e) {
                console.warn('添加上班地点标记失败:', e);
              }
            },
          });
        }

        results.forEach((apartment) => {
          if (!apartment?.address) return;
          geocoder.getLocation({
            address: apartment.address,
            success: (result) => {
              if (cancelled || !mapInstance.current) return;
              try {
                if (result?.result?.location) {
                  const loc = result.result.location;
                  const marker = new window.TMap.Marker({
                    map: mapInstance.current,
                    position: new window.TMap.LatLng(loc.lat, loc.lng),
                  });
                  markersRef.current.push(marker);
                }
              } catch (e) {
                console.warn('添加公寓标记失败:', e);
              }
            },
          });
        });
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    }

    if (!window.TMap || !mapContainer.current) {
      const timer = setTimeout(() => {
        if (window.TMap && mapContainer.current) initMap();
      }, 500);
      return () => {
        cancelled = true;
        clearTimeout(timer);
        markersRef.current.forEach(m => {
          try { if (m?.destroy) m.destroy(); } catch (e) {}
        });
      };
    }

    initMap();
    return () => {
      cancelled = true;
      markersRef.current.forEach(m => {
        try { if (m?.destroy) m.destroy(); } catch (e) {}
      });
    };
  }, [results, workAddress]);

  return (
    <div className="map-view">
      <div ref={mapContainer} className="map-container" />
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-icon work-icon">📍</span>
          <span>上班地点</span>
        </div>
        <div className="legend-item">
          <span className="legend-icon apartment-icon">🏠</span>
          <span>推荐公寓</span>
        </div>
      </div>
    </div>
  );
}

export default MapView;
