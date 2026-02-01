import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** 公寓管理后台 - Vite 配置，端口 5174 与主站区分 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
