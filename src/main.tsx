import { disableReactDevTools } from './utils/antiTamper';

// Khóa hoàn toàn React DevTools Hook ngay khi tải trang
disableReactDevTools();

// Ở môi trường Production: Tắt console.log và console.debug để chống rò rỉ dữ liệu qua F12
if (import.meta.env.PROD) {
  console.log = () => {};
  console.debug = () => {};
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

