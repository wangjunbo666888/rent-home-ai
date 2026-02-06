/**
 * 公寓新增/编辑表单
 * 路由：/new（新增）、/:id/edit（编辑）
 * 字段顺序：区域、名称、地址（联想）、最低/最高月租、备注、图片/视频上传
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authFetch } from '../utils/auth.js';
import './ApartmentForm.css';

const API_BASE = '/api/admin/apartments';
const SUGGESTION_API = '/api/admin/suggestion';
const REGION = '北京市';
const DEBOUNCE_MS = 300;

const defaultForm = {
  name: '',
  minPrice: '',
  maxPrice: '',
  address: '',
  district: '',
  remarks: '',
  images: [],
  videos: []
};

function ApartmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(defaultForm);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState(null);

  /** 地址联想 */
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const debounceRef = useRef(null);

  /** 拉取区域下拉 */
  useEffect(() => {
    authFetch('/api/admin/districts')
      .then(res => res.json())
      .then(json => { if (json.success) setDistricts(json.data || []); })
      .catch(() => setDistricts([]));
  }, []);

  /** 编辑时拉取单条 */
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    setFetchLoading(true);
    setError(null);
    authFetch(`${API_BASE}/${id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success && json.data) {
          const d = json.data;
          setForm({
            name: d.name ?? '',
            minPrice: d.minPrice ?? '',
            maxPrice: d.maxPrice ?? '',
            address: d.address ?? '',
            district: d.district ?? '',
            remarks: d.remarks ?? '',
            images: Array.isArray(d.images) ? d.images : [],
            videos: Array.isArray(d.videos) ? d.videos : []
          });
        } else {
          setError(json.message || '加载失败');
        }
      })
      .catch(err => { if (!cancelled) setError('网络错误: ' + err.message); })
      .finally(() => { if (!cancelled) setFetchLoading(false); });
    return () => { cancelled = true; };
  }, [id, isEdit]);

  /** 地址联想请求（防抖） */
  const fetchAddressSuggestions = (keyword) => {
    if (!keyword || !keyword.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionLoading(true);
    authFetch(`${SUGGESTION_API}?keyword=${encodeURIComponent(keyword.trim())}&region=${encodeURIComponent(REGION)}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setSuggestions(json.data);
          setSuggestionOpen(true);
        } else setSuggestions([]);
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionLoading(false));
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setForm(prev => ({ ...prev, address: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); setSuggestionOpen(false); return; }
    debounceRef.current = setTimeout(() => fetchAddressSuggestions(value), DEBOUNCE_MS);
  };

  const handleSelectSuggestion = (item) => {
    const full = (item.address && item.address.trim()) ? item.address.trim() : (item.title || '').trim();
    if (full) setForm(prev => ({ ...prev, address: full }));
    setSuggestions([]);
    setSuggestionOpen(false);
  };

  const handleAddressBlur = () => setTimeout(() => setSuggestionOpen(false), 200);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  /** 月租数字合法性校验 */
  const validateRent = () => {
    const min = Number(form.minPrice);
    const max = Number(form.maxPrice);
    if (form.minPrice !== '' && (Number.isNaN(min) || min < 0)) {
      setError('最低月租请输入有效数字且不能为负数');
      return false;
    }
    if (form.maxPrice !== '' && (Number.isNaN(max) || max < 0)) {
      setError('最高月租请输入有效数字且不能为负数');
      return false;
    }
    const minVal = Number(form.minPrice) || 0;
    const maxVal = Number(form.maxPrice) || 0;
    if (minVal > maxVal) {
      setError('最低月租不能大于最高月租');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validateRent()) return;

    /** 同一区域内名称重复校验 */
    try {
      const checkRes = await authFetch(`${API_BASE}/check-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          district: form.district,
          id: isEdit ? id : undefined
        })
      });
      const checkJson = await checkRes.json();
      if (checkJson.success && checkJson.duplicate) {
        setError('公寓名称重复，同一区域内不能重名');
        return;
      }
    } catch (err) {
      setError('校验名称失败: ' + err.message);
      return;
    }

    setLoading(true);
    const payload = {
      ...form,
      minPrice: Number(form.minPrice) || 0,
      maxPrice: Number(form.maxPrice) || 0,
      images: form.images,
      videos: form.videos
    };

    try {
      const url = isEdit ? `${API_BASE}/${id}` : API_BASE;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) navigate('/');
      else setError(json.message || '保存失败');
    } catch (err) {
      setError('请求失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /** 上传图片到 COS，返回 url 后加入 images */
  const handleImageUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    e.target.value = '';
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'image');
    try {
      const res = await authFetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success && json.url) {
        const title = `图片${(form.images.length || 0) + 1}`;
        setForm(prev => ({ ...prev, images: [...(prev.images || []), { url: json.url, title }] }));
      } else setError(json.message || '图片上传失败');
    } catch (err) {
      setError('图片上传失败: ' + err.message);
    }
  };

  /** 上传视频到 COS */
  const handleVideoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', 'video');
    try {
      const res = await authFetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success && json.url) {
        const title = `视频${(form.videos.length || 0) + 1}`;
        setForm(prev => ({ ...prev, videos: [...(prev.videos || []), { url: json.url, title, description: '' }] }));
      } else setError(json.message || '视频上传失败');
    } catch (err) {
      setError('视频上传失败: ' + err.message);
    }
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const updateImageTitle = (index, title) => {
    setForm(prev => {
      const next = [...(prev.images || [])];
      next[index] = { ...next[index], title };
      return { ...prev, images: next };
    });
  };

  const removeVideo = (index) => {
    setForm(prev => ({
      ...prev,
      videos: (prev.videos || []).filter((_, i) => i !== index)
    }));
  };

  const updateVideo = (index, field, value) => {
    setForm(prev => {
      const next = [...(prev.videos || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, videos: next };
    });
  };

  if (fetchLoading) {
    return (
      <div className="apartment-form-page">
        <div className="apartment-form-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="apartment-form-page">
      <header className="apartment-form-header">
        <h1>{isEdit ? '编辑公寓' : '新增公寓'}</h1>
        <Link to="/" className="link-back">返回列表</Link>
      </header>

      {error && <div className="apartment-form-error">{error}</div>}

      <form className="apartment-form" onSubmit={handleSubmit}>
        {/* 第一行：区域、名称 */}
        <div className="form-row form-row-inline form-row-1">
          <div className="form-field">
            <label>区域 *</label>
            <select
              value={form.district}
              onChange={e => handleChange('district', e.target.value)}
              required
            >
              <option value="">请选择区域</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>名称 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              placeholder="公寓名称"
            />
          </div>
        </div>

        {/* 第二行：地址、最低月租、最高月租 */}
        <div className="form-row form-row-inline form-row-2">
          <div className="form-field form-field-address">
            <label>地址</label>
            <div className="address-input-wrap">
              <input
                type="text"
                value={form.address}
                onChange={handleAddressChange}
                onFocus={() => suggestions.length > 0 && setSuggestionOpen(true)}
                onBlur={handleAddressBlur}
                placeholder="输入关键词联想地址，如：朝阳区化工路"
                autoComplete="off"
              />
              {suggestionLoading && <span className="address-loading">加载中...</span>}
              {suggestionOpen && suggestions.length > 0 && (
                <ul className="address-suggestion-list" role="listbox">
                  {suggestions.map(item => (
                    <li
                      key={item.id || item.title + (item.address || '')}
                      className="address-suggestion-item"
                      role="option"
                      onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(item); }}
                    >
                      <span className="suggestion-title">{item.title || '未知'}</span>
                      {item.address && <span className="suggestion-address">{item.address}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="form-field form-field-rent">
            <label>最低月租（元）</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.minPrice}
              onChange={e => handleChange('minPrice', e.target.value)}
              placeholder="2500"
            />
          </div>
          <div className="form-field form-field-rent">
            <label>最高月租（元）</label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.maxPrice}
              onChange={e => handleChange('maxPrice', e.target.value)}
              placeholder="3500"
            />
          </div>
        </div>

        {/* 第三行：备注 */}
        <div className="form-row">
          <label>备注</label>
          <textarea
            value={form.remarks}
            onChange={e => handleChange('remarks', e.target.value)}
            placeholder="有班车、近地铁等"
            rows={2}
          />
        </div>

        {/* 第四行：图片（横向排列） */}
        <div className="form-row form-row-upload">
          <label>图片</label>
          <div className="upload-section">
            <label className="upload-btn">
              <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
              从本地上传图片
            </label>
            <ul className="upload-list upload-list-image">
              {(form.images || []).map((img, i) => (
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
                  <input
                    type="text"
                    value={img.title || ''}
                    onChange={e => updateImageTitle(i, e.target.value)}
                    placeholder="图片说明"
                    className="upload-title-input"
                  />
                  <button type="button" className="btn-remove" onClick={() => removeImage(i)}>删除</button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 第五行：视频（横向排列） */}
        <div className="form-row form-row-upload">
          <label>视频</label>
          <div className="upload-section">
            <label className="upload-btn">
              <input type="file" accept="video/*" onChange={handleVideoUpload} hidden />
              从本地上传视频
            </label>
            <ul className="upload-list upload-list-video">
              {(form.videos || []).map((v, i) => (
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
                  <input
                    type="text"
                    value={v.title || ''}
                    onChange={e => updateVideo(i, 'title', e.target.value)}
                    placeholder="视频标题"
                    className="upload-title-input"
                  />
                  <input
                    type="text"
                    value={v.description || ''}
                    onChange={e => updateVideo(i, 'description', e.target.value)}
                    placeholder="描述（可选）"
                    className="upload-desc-input"
                  />
                  <div className="upload-video-actions">
                    {v.url ? (
                      <a href={v.url} download className="link-download" title="下载视频">
                        ↓ 下载视频
                      </a>
                    ) : (
                      <span className="upload-no-url">暂无视频地址</span>
                    )}
                    <button type="button" className="btn-remove" onClick={() => removeVideo(i)}>删除</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
          <Link to="/" className="btn btn-secondary">取消</Link>
        </div>
      </form>
    </div>
  );
}

export default ApartmentForm;
