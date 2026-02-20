
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const render = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("L'élément #root est introuvable.");
    return;
  }
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render);
} else {
  render();
}
