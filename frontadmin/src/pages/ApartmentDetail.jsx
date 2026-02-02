/**
 * 公寓详情页：只读展示，布局与编辑页相似
 */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import './ApartmentForm.css';
import './ApartmentDetail.css';

const API_BASE = '/api/admin/apartments';

function ApartmentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/${id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.message || '加载失败');
        }
      })
      .catch(err => { if (!cancelled) setError('网络错误: ' + err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="apartment-form-page apartment-detail-page">
        <div className="apartment-form-loading">加载中...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="apartment-form-page apartment-detail-page">
        <header className="apartment-form-header">
          <h1>公寓详情</h1>
          <Link to="/" className="link-back">返回列表</Link>
        </header>
        <div className="apartment-form-error">{error || '未找到该公寓'}</div>
      </div>
    );
  }

  const d = data;
  const images = Array.isArray(d.images) ? d.images : [];
  const videos = Array.isArray(d.videos) ? d.videos : [];

  return (
    <div className="apartment-form-page apartment-detail-page">
      <header className="apartment-form-header">
        <h1>公寓详情</h1>
        <div className="apartment-detail-actions">
          <Link to={`/${id}/edit`} className="btn btn-primary">编辑</Link>
          <Link to="/" className="link-back">返回列表</Link>
        </div>
      </header>

      <div className="apartment-detail-body">
        {/* 第一行：区域、名称 */}
        <div className="form-row form-row-inline form-row-1">
          <div className="form-field">
            <label>区域</label>
            <div className="detail-value">{d.district || '-'}</div>
          </div>
          <div className="form-field">
            <label>名称</label>
            <div className="detail-value">{d.name || '-'}</div>
          </div>
        </div>

        {/* 第二行：地址、最低月租、最高月租 */}
        <div className="form-row form-row-inline form-row-2">
          <div className="form-field form-field-address">
            <label>地址</label>
            <div className="detail-value">{d.address || '-'}</div>
          </div>
          <div className="form-field form-field-rent">
            <label>最低月租（元）</label>
            <div className="detail-value">{d.minPrice ?? '-'}</div>
          </div>
          <div className="form-field form-field-rent">
            <label>最高月租（元）</label>
            <div className="detail-value">{d.maxPrice ?? '-'}</div>
          </div>
        </div>

        {/* 第三行：备注 */}
        <div className="form-row">
          <label>备注</label>
          <div className="detail-value detail-value-multiline">{d.remarks || '-'}</div>
        </div>

        {/* 第四行：图片（横向排列） */}
        <div className="form-row form-row-upload">
          <label>图片</label>
          <div className="upload-section">
            <ul className="upload-list upload-list-image">
              {images.length === 0 ? (
                <span className="detail-empty">暂无图片</span>
              ) : (
                images.map((img, i) => (
                  <li key={img.url ? `${img.url}-${i}` : i} className="upload-item upload-item-image">
                    <div className="upload-thumb-wrap upload-thumb-wrap-card">
                      {img.url ? (
                        <>
                          <img
                            src={img.url}
                            alt={img.title || '图片'}
                            className="upload-thumb"
                            onError={e => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextElementSibling?.classList?.add('show'); }}
                          />
                          <span className="upload-thumb-placeholder">暂无预览</span>
                        </>
                      ) : (
                        <span className="upload-thumb-placeholder show">暂无预览</span>
                      )}
                    </div>
                    <div className="detail-value detail-value-caption">{img.title || '图片'}</div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* 第五行：视频（横向排列，当前页播放） */}
        <div className="form-row form-row-upload">
          <label>视频</label>
          <div className="upload-section">
            <ul className="upload-list upload-list-video">
              {videos.length === 0 ? (
                <span className="detail-empty">暂无视频</span>
              ) : (
                videos.map((v, i) => (
                  <li key={v.url ? `${v.url}-${i}` : i} className="upload-item upload-item-video">
                    <div className="upload-video-player-wrap">
                      {v.url ? (
                        <video
                          src={v.url}
                          className="upload-video-player"
                          controls
                          preload="metadata"
                          playsInline
                          title={v.title || `视频 ${i + 1}`}
                        />
                      ) : (
                        <span className="upload-video-placeholder">暂无视频</span>
                      )}
                    </div>
                    <div className="detail-value">{v.title || `视频 ${i + 1}`}</div>
                    {v.description ? <div className="detail-value detail-value-desc">{v.description}</div> : null}
                    {v.url ? (
                      <a href={v.url} download className="link-download" title="下载视频">↓ 下载视频</a>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApartmentDetail;
