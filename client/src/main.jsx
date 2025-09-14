import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/index.jsx';
import Ejercicio from './pages/ejercicio/ejercicio.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ejercicio/:id" element={<Ejercicio />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
