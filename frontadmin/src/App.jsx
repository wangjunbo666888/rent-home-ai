/**
 * 公寓管理后台 - 路由：登录 / 列表 / 新增 / 编辑 / 详情
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './utils/auth.js';
import LoginPage from './pages/LoginPage';
import ApartmentList from './pages/ApartmentList';
import ApartmentForm from './pages/ApartmentForm';
import ApartmentDetail from './pages/ApartmentDetail';
import './App.css';

/**
 * 受保护路由：未登录时重定向到登录页
 */
function ProtectedRoute({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ApartmentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <ApartmentForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:id/edit"
          element={
            <ProtectedRoute>
              <ApartmentForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/:id"
          element={
            <ProtectedRoute>
              <ApartmentDetail />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
