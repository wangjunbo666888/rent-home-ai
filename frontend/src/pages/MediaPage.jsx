/**
 * 媒体详情独立页
 * 展示指定公寓的图片与视频，支持下载
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../App.css';
import './MediaPage.css';

/**
 * 下载图片或视频：优先 fetch+blob 触发保存，跨域失败则新窗口打开由用户另存为
 * @param {string} url - 资源 URL
 * @param {string} filename - 保存文件名
 */
function handleDownload(url, filename) {
  fetch(url, { mode: 'cors' })
    .then((res) => {
      if (!res.ok) throw new Error('下载失败');
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(() => {
      window.open(url, '_blank', 'noopener');
    });
}

function MediaPage() {
  const location = useLocation();
  const state = location.state || {};
  const apartment = state.apartment || null;

  const [activeTab, setActiveTab] = useState('images');

  const images = Array.isArray(apartment?.images) ? apartment.images : [];
  const videos = Array.isArray(apartment?.videos) ? apartment.videos : [];
  const hasImages = images.length > 0;
  const hasVideos = videos.length > 0;
  const hasMedia = hasImages || hasVideos;

  if (!apartment) {
    return (
      <div className="app media-page">
        <header className="app-header media-page-header">
          <div className="media-page-header-inner">
            <div className="media-page-title-wrap">
              <h1>媒体详情</h1>
            </div>
          </div>
        </header>
        <main className="app-main">
          <div className="media-empty-state">
            <p>未选择公寓，请从结果列表进入</p>
          </div>
        </main>
      </div>
    );
  }

  const safeName = (apartment.name || '公寓').replace(/[/\\?%*:|"<>]/g, '_');

  return (
    <div className="app media-page">
      <header className="app-header media-page-header">
        <div className="media-page-header-inner">
          <div className="media-page-title-wrap">
            <h1>📷 {apartment.name} - 图片与视频</h1>
            <p>查看并下载公寓实拍图片与视频</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        {!hasMedia ? (
          <div className="media-empty-state">
            <p>该公寓暂无图片或视频</p>
          </div>
        ) : (
          <>
            <div className="media-tabs">
              {hasImages && (
                <button
                  type="button"
                  className={`media-tab ${activeTab === 'images' ? 'active' : ''}`}
                  onClick={() => setActiveTab('images')}
                >
                  📷 图片 ({images.length})
                </button>
              )}
              {hasVideos && (
                <button
                  type="button"
                  className={`media-tab ${activeTab === 'videos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('videos')}
                >
                  🎬 视频 ({videos.length})
                </button>
              )}
            </div>

            {activeTab === 'images' && hasImages && (
              <div className="media-section">
                <div className="media-grid">
                  {images.map((item, index) => {
                    const url = item.url || item;
                    const title = typeof item === 'object' ? item.title : null;
                    const label = title || `图片${index + 1}`;
                    const ext = (url.split('.').pop() || 'jpg').split('?')[0];
                    const filename = `${safeName}-${label}.${ext}`;
                    return (
                      <div key={index} className="media-card media-card-image">
                        <div className="media-card-preview">
                          <img src={url} alt={label} loading="lazy" />
                        </div>
                        {title && <p className="media-card-title">{title}</p>}
                        <button
                          type="button"
                          className="btn-download"
                          onClick={() => handleDownload(url, filename)}
                        >
                          ⬇ 下载图片
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'videos' && hasVideos && (
              <div className="media-section">
                <div className="media-video-list">
                  {videos.map((item, index) => {
                    const url = item.url || item;
                    const title = typeof item === 'object' ? item.title : null;
                    const label = title || `视频${index + 1}`;
                    const ext = (url.split('.').pop() || 'mp4').split('?')[0];
                    const filename = `${safeName}-${label}.${ext}`;
                    return (
                      <div key={index} className="media-card media-card-video">
                        <div className="media-card-preview video-wrap">
                          <video src={url} controls preload="metadata" poster="" />
                        </div>
                        {title && <h3 className="media-video-title">{title}</h3>}
                        <button
                          type="button"
                          className="btn-download"
                          onClick={() => handleDownload(url, filename)}
                        >
                          ⬇ 下载视频
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default MediaPage;
