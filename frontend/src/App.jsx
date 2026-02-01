/**
 * 主应用组件
 * 租房匹配系统前端 - 路由配置：首页(输入需求) / 结果页(列表+地图)
 */
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import MediaPage from './pages/MediaPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/results/media" element={<MediaPage />} />
    </Routes>
  );
}

export default App;
