/**
 * 公寓列表页：展示所有公寓，支持条件搜索、分页、新增、编辑、删除
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './ApartmentList.css';

const API_BASE = '/api/admin/apartments';
const PAGE_SIZE = 10;

function ApartmentList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  /** 搜索条件：区域、公寓名（模糊） */
  const [searchRegion, setSearchRegion] = useState('');
  const [searchName, setSearchName] = useState('');
  /** 当前页码，从 1 开始 */
  const [currentPage, setCurrentPage] = useState(1);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.success) {
        setList(json.data || []);
      } else {
        setError(json.message || '加载失败');
      }
    } catch (err) {
      setError('网络错误: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  /** 根据区域、公寓名模糊过滤 */
  const filteredList = useMemo(() => {
    const region = (searchRegion || '').trim();
    const name = (searchName || '').trim();
    if (!region && !name) return list;
    return list.filter(item => {
      const matchRegion = !region || (item.district || '').includes(region);
      const matchName = !name || (item.name || '').includes(name);
      return matchRegion && matchName;
    });
  }, [list, searchRegion, searchName]);

  /** 总页数 */
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  /** 当前页数据 */
  const pageList = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredList.slice(start, start + PAGE_SIZE);
  }, [filteredList, currentPage]);

  /** 搜索条件变化时回到首页 */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchRegion, searchName]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`确定要删除「${name || id}」吗？`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setList(prev => prev.filter(item => item.id !== id));
      } else {
        alert(json.message || '删除失败');
      }
    } catch (err) {
      alert('删除失败: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const goFirst = () => setCurrentPage(1);
  const goPrev = () => setCurrentPage(p => Math.max(1, p - 1));
  const goNext = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  if (loading) {
    return (
      <div className="apartment-list-page">
        <div className="apartment-list-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="apartment-list-page">
      <header className="apartment-list-header">
        <h1>公寓管理</h1>
        <div className="apartment-list-actions">
          <Link to="/new" className="btn btn-primary">新增公寓</Link>
        </div>
      </header>

      {error && <div className="apartment-list-error">{error}</div>}

      <div className="apartment-list-search">
        <div className="search-row">
          <label>区域</label>
          <input
            type="text"
            value={searchRegion}
            onChange={e => setSearchRegion(e.target.value)}
            placeholder="输入区域模糊搜索"
          />
        </div>
        <div className="search-row">
          <label>公寓名</label>
          <input
            type="text"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="输入公寓名模糊搜索"
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => { setSearchRegion(''); setSearchName(''); setCurrentPage(1); }}
        >
          重置
        </button>
      </div>

      <p className="apartment-list-summary">
        共 {filteredList.length} 条，每页 {PAGE_SIZE} 条
      </p>

      <div className="apartment-list-table-wrap">
        <table className="apartment-list-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>价格区间（元）</th>
              <th>地址</th>
              <th>区域</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {pageList.length === 0 ? (
              <tr>
                <td colSpan={7} className="apartment-list-empty">
                  {filteredList.length === 0 && (searchRegion || searchName) ? '无匹配结果' : '暂无公寓数据'}
                </td>
              </tr>
            ) : (
              pageList.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{item.minPrice} ~ {item.maxPrice}</td>
                  <td className="cell-address">{item.address}</td>
                  <td>{item.district}</td>
                  <td className="cell-remarks">{item.remarks || '-'}</td>
                  <td>
                    <Link to={`/${item.id}`} className="btn btn-view">查看</Link>
                    <Link to={`/${item.id}/edit`} className="btn btn-edit">编辑</Link>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      {deletingId === item.id ? '删除中...' : '删除'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="apartment-list-pagination">
        <button
          type="button"
          className="btn btn-page"
          disabled={currentPage <= 1}
          onClick={goFirst}
        >
          首页
        </button>
        <button
          type="button"
          className="btn btn-page"
          disabled={currentPage <= 1}
          onClick={goPrev}
        >
          上一页
        </button>
        <span className="pagination-info">
          第 {currentPage} / {totalPages} 页
        </span>
        <button
          type="button"
          className="btn btn-page"
          disabled={currentPage >= totalPages}
          onClick={goNext}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export default ApartmentList;
