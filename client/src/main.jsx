import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/index.jsx';
import Ejercicio from './pages/ejercicios/ejercicio.jsx';
import Register from './pages/usuarios/register.jsx';
import Login from './pages/usuarios/login.jsx'; 
import ResultadoFinal from './pages/ejercicios/resultadoFinal.jsx'
import Logout from "./pages/usuarios/logout.jsx";
import Feed from "./pages/comunidad/feed.jsx";
import Perfil from "./pages/perfil/perfil.jsx";
import Oferta from "./pages/entrevistas/oferta.jsx";
import Postulacion from "./pages/entrevistas/postulacion.jsx";
import OfertaDetalle from "./pages/entrevistas/ofertaDetalle.jsx";
import Torneo from "./pages/torneos/torneo.jsx";
import TorneoDetalle from "./pages/torneos/torneoDetalle.jsx";

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ejercicio/:id" element={<Ejercicio />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/resultado/:id" element={<ResultadoFinal />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/comunidad" element={<Feed />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/entrevistas" element={<Oferta />} />
        <Route path="/entrevistas/mis-postulaciones" element={<Postulacion />} />
        <Route path="/entrevistas/oferta/:id" element={<OfertaDetalle />} />
        <Route path="/torneos" element={<Torneo />} />
        <Route path="/torneos/:id" element={<TorneoDetalle />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
