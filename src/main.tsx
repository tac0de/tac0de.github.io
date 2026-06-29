import React from 'react';
import ReactDOM from 'react-dom/client';
import { LivingScrollGallery } from './LivingScrollGallery';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LivingScrollGallery />
  </React.StrictMode>,
);
