import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Hide React DevTools development info message
// @ts-ignore
if (typeof window !== 'undefined') window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
