/**
 * 管理员登录页：用户名 + 密码
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAdminToken, isLoggedIn } from '../utils/auth.js';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoggedIn()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const u = username.trim();
    const p = password;
    if (!u) {
      setError('请输入用户名');
      return;
    }
    if (!p) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const json = await res.json();

      if (json.success && json.token) {
        setAdminToken(json.token);
        navigate('/', { replace: true });
      } else {
        setError(json.message || '登录失败');
      }
    } catch (err) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">公寓管理</h1>
        <p className="login-desc">管理员登录</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="请输入用户名"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="请输入密码"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
