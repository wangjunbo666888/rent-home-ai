/**
 * 公寓管理后台 - 路由：列表 / 新增 / 编辑
 */
import { Routes, Route } from 'react-router-dom';
import ApartmentList from './pages/ApartmentList';
import ApartmentForm from './pages/ApartmentForm';
import './App.css';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<ApartmentList />} />
        <Route path="/new" element={<ApartmentForm />} />
        <Route path="/:id/edit" element={<ApartmentForm />} />
      </Routes>
    </div>
  );
}

export default App;
