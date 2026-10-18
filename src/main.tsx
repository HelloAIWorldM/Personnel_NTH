import { disableReactDevTools } from './utils/antiTamper';

// Khóa hoàn toàn React DevTools Hook ngay khi tải trang
disableReactDevTools();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

