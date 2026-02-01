/**
 * 地图视图组件
 * 使用腾讯地图 GL 展示公寓位置和上班地点，支持高清屏与容器尺寸变化
 * GL 版使用 MultiMarker 图层管理点标记，Geocoder 做地址解析
 */
import { useEffect, useRef } from 'react';
import './MapView.css';

/** 获取地图显示比例，用于高清屏（Retina）更清晰 */
function getMapScale() {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  return Math.min(Math.max(dpr, 1), 3);
}

/** 上班地点红色标记图（SVG data URL） */
const WORK_MARKER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path fill="#e74c3c" stroke="#c0392b" stroke-width="1.5" d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z"/><circle fill="white" cx="14" cy="14" r="6"/></svg>'
);
/** 推荐公寓蓝色标记图（SVG data URL） */
const APARTMENT_MARKER_SVG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path fill="#3498db" stroke="#2980b9" stroke-width="1.5" d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z"/><circle fill="white" cx="14" cy="14" r="6"/></svg>'
);

function MapView({ results, workAddress, workLocation }) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const multiMarkerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    function initMap() {
      try {
        if (!mapContainer.current || !window.TMap) return;

        const TMap = window.TMap;
        const defaultCenter = new TMap.LatLng(39.908823, 116.397470);
        const workCenter =
          workLocation && typeof workLocation.lat === 'number' && typeof workLocation.lng === 'number'
            ? new TMap.LatLng(workLocation.lat, workLocation.lng)
            : defaultCenter;

        // 创建地图实例：有上班地点时以上班地点为中心，否则用默认中心；高清屏使用 scale 提升画质
        if (!mapInstance.current) {
          const scale = getMapScale();
          mapInstance.current = new TMap.Map(mapContainer.current, {
            center: workCenter,
            zoom: 12,
            scale,
          });
        } else if (workLocation && typeof workLocation.lat === 'number' && typeof workLocation.lng === 'number') {
          mapInstance.current.setCenter(workCenter);
        }

        // GL 版使用 MultiMarker，先销毁旧图层
        if (multiMarkerRef.current) {
          try {
            multiMarkerRef.current.setMap(null);
            multiMarkerRef.current = null;
          } catch (e) {}
        }

        if (results.length === 0 && !workAddress && !workLocation) return;

        const prevTip = mapContainer.current?.querySelector('.map-geocoder-tip');
        if (prevTip) prevTip.remove();

        // 创建 MultiMarker 图层：上班地点（红）、推荐公寓（蓝）
        multiMarkerRef.current = new TMap.MultiMarker({
          map: mapInstance.current,
          styles: {
            work: new TMap.MarkerStyle({
              width: 28,
              height: 40,
              anchor: { x: 14, y: 40 },
              src: WORK_MARKER_SVG,
            }),
            apartment: new TMap.MarkerStyle({
              width: 28,
              height: 40,
              anchor: { x: 14, y: 40 },
              src: APARTMENT_MARKER_SVG,
            }),
          },
          geometries: [],
        });

        function addWorkMarker(lat, lng) {
          if (cancelled || !multiMarkerRef.current) return;
          multiMarkerRef.current.add([
            {
              id: 'work-1',
              styleId: 'work',
              position: new TMap.LatLng(lat, lng),
              properties: { title: '上班地点' },
            },
          ]);
        }

        function addApartmentMarker(index, lat, lng) {
          if (cancelled || !multiMarkerRef.current) return;
          multiMarkerRef.current.add([
            {
              id: 'apt-' + index,
              styleId: 'apartment',
              position: new TMap.LatLng(lat, lng),
              properties: { title: '推荐公寓' },
            },
          ]);
        }

        // 优先使用后端返回的坐标打点，避免前端 Geocoder 触发「此key每秒请求量已达到上限」
        if (workLocation && typeof workLocation.lat === 'number' && typeof workLocation.lng === 'number') {
          addWorkMarker(workLocation.lat, workLocation.lng);
        }

        results.forEach((apartment, index) => {
          if (typeof apartment?.lat === 'number' && typeof apartment?.lng === 'number') {
            addApartmentMarker(index, apartment.lat, apartment.lng);
          }
        });

        // 仅当缺少坐标时才用 Geocoder 补全（会受 QPS 限制，正常流程应依赖后端坐标）
        const needGeocoder = (workAddress && !workLocation?.lat) || results.some(r => r?.address && (typeof r.lat !== 'number' || typeof r.lng !== 'number'));
        if (!needGeocoder) {
          if (mapInstance.current?.resize) mapInstance.current.resize();
          return;
        }

        const Geocoder = TMap?.service?.Geocoder || TMap?.Geocoder;
        if (!Geocoder) {
          console.warn('腾讯地图 Geocoder 不可用，地图标记将仅显示后端返回的坐标');
          if (mapInstance.current?.resize) mapInstance.current.resize();
          return;
        }
        const geocoder = new Geocoder();

        function getLocationFromResult(result) {
          const loc = result?.result?.location || result?.location;
          return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number' ? loc : null;
        }

        if (workAddress && !(workLocation && typeof workLocation.lat === 'number')) {
          geocoder.getLocation({
            address: workAddress,
            success: (result) => {
              if (cancelled || !mapInstance.current) return;
              try {
                const loc = getLocationFromResult(result);
                if (loc) addWorkMarker(loc.lat, loc.lng);
              } catch (e) {
                console.warn('添加上班地点标记失败:', e);
              }
            },
            fail: (err) => {
              console.warn('上班地点解析失败:', workAddress, err);
            },
          });
        }

        results.forEach((apartment, index) => {
          if (typeof apartment?.lat === 'number' && typeof apartment?.lng === 'number') return;
          if (!apartment?.address) return;
          geocoder.getLocation({
            address: apartment.address,
            success: (result) => {
              if (cancelled || !mapInstance.current) return;
              try {
                const loc = getLocationFromResult(result);
                if (loc) addApartmentMarker(index, loc.lat, loc.lng);
              } catch (e) {
                console.warn('添加公寓标记失败:', e);
              }
            },
            fail: (err) => {
              console.warn('公寓地址解析失败:', apartment.address, err);
            },
          });
        });

        if (mapInstance.current?.resize) mapInstance.current.resize();
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
        if (multiMarkerRef.current) {
          try { multiMarkerRef.current.setMap(null); } catch (e) {}
          multiMarkerRef.current = null;
        }
      };
    }

    // 延迟一帧再初始化，确保容器已获得布局尺寸
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      initMap();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (multiMarkerRef.current) {
        try { multiMarkerRef.current.setMap(null); } catch (e) {}
        multiMarkerRef.current = null;
      }
    };
  }, [results, workAddress, workLocation]);

  // 容器尺寸变化时调用 map.resize()，保证地图清晰且填满容器（map 可能尚未创建，resizeMap 内会判断）
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    const resizeMap = () => {
      try {
        if (mapInstance.current && typeof mapInstance.current.resize === 'function') {
          mapInstance.current.resize();
        }
      } catch (e) {
        console.warn('地图 resize 失败:', e);
      }
    };

    const onWindowResize = () => resizeMap();
    window.addEventListener('resize', onWindowResize);

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => resizeMap());
      observer.observe(container);
    }

    // 地图创建后可能已存在，立即刷新一次
    const t = setTimeout(resizeMap, 600);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', onWindowResize);
      if (observer) observer.disconnect();
    };
  }, [results, workAddress, workLocation]);

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
