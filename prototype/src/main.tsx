import React from 'react';
import ReactDOM from 'react-dom/client';
// Blueprint styles are required by Polotno's UI components.
import '@blueprintjs/core/lib/css/blueprint.css';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
