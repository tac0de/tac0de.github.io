import React from 'react';
import ReactDOM from 'react-dom/client';
import { GlassWound } from './GlassWound';
import { PressureBloom } from './PressureBloom';
import './styles/global.css';

const Artwork = window.location.pathname === '/glass-wound' ? GlassWound : PressureBloom;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Artwork />
  </React.StrictMode>,
);
