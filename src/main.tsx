import React from 'react';
import ReactDOM from 'react-dom/client';
import { PressureBloom } from './PressureBloom';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PressureBloom />
  </React.StrictMode>,
);
