/**
 * 公寓新增/编辑表单
 * 路由：/new（新增）、/:id/edit（编辑）
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import './ApartmentForm.css';

const API_BASE = '/api/admin/apartments';

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
  const [imagesJson, setImagesJson] = useState('[]');
  const [videosJson, setVideosJson] = useState('[]');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setFetchLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/${id}`);
        const json = await res.json();
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
          setImagesJson(JSON.stringify(Array.isArray(d.images) ? d.images : [], null, 2));
          setVideosJson(JSON.stringify(Array.isArray(d.videos) ? d.videos : [], null, 2));
        } else {
          setError(json.message || '加载失败');
        }
      } catch (err) {
        if (!cancelled) setError('网络错误: ' + err.message);
      } finally {
        if (!cancelled) setFetchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const parseJson = (str, fallback) => {
    try {
      const arr = JSON.parse(str);
      return Array.isArray(arr) ? arr : fallback;
    } catch {
      return fallback;
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const images = parseJson(imagesJson, []);
    const videos = parseJson(videosJson, []);
    const payload = {
      ...form,
      minPrice: Number(form.minPrice) || 0,
      maxPrice: Number(form.maxPrice) || 0,
      images,
      videos
    };

    try {
      const url = isEdit ? `${API_BASE}/${id}` : API_BASE;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        navigate('/');
      } else {
        setError(json.message || '保存失败');
      }
    } catch (err) {
      setError('请求失败: ' + err.message);
    } finally {
      setLoading(false);
    }
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
        <div className="form-row">
          <label>名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => handleChange('name', e.target.value)}
            required
            placeholder="公寓名称"
          />
        </div>
        <div className="form-row two">
          <div>
            <label>最低月租（元）</label>
            <input
              type="number"
              min={0}
              value={form.minPrice}
              onChange={e => handleChange('minPrice', e.target.value)}
              placeholder="2500"
            />
          </div>
          <div>
            <label>最高月租（元）</label>
            <input
              type="number"
              min={0}
              value={form.maxPrice}
              onChange={e => handleChange('maxPrice', e.target.value)}
              placeholder="3500"
            />
          </div>
        </div>
        <div className="form-row">
          <label>地址</label>
          <input
            type="text"
            value={form.address}
            onChange={e => handleChange('address', e.target.value)}
            placeholder="北京市朝阳区..."
          />
        </div>
        <div className="form-row">
          <label>区域</label>
          <input
            type="text"
            value={form.district}
            onChange={e => handleChange('district', e.target.value)}
            placeholder="朝阳区"
          />
        </div>
        <div className="form-row">
          <label>备注</label>
          <textarea
            value={form.remarks}
            onChange={e => handleChange('remarks', e.target.value)}
            placeholder="有班车、近地铁等"
            rows={2}
          />
        </div>
        <div className="form-row">
          <label>图片（JSON 数组）</label>
          <textarea
            value={imagesJson}
            onChange={e => setImagesJson(e.target.value)}
            placeholder='[{"url":"https://...","title":"客厅"}]'
            rows={4}
            className="form-json"
          />
          <span className="form-hint">格式：[{'"'}url{'"'}, {'"'}title{'"'}]</span>
        </div>
        <div className="form-row">
          <label>视频（JSON 数组）</label>
          <textarea
            value={videosJson}
            onChange={e => setVideosJson(e.target.value)}
            placeholder='[{"url":"https://...","title":"实拍","description":"..."}]'
            rows={4}
            className="form-json"
          />
          <span className="form-hint">格式：[{'"'}url{'"'}, {'"'}title{'"'}, {'"'}description{'"'}]</span>
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
