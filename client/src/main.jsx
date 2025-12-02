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
import RewardOnRoute from './components/RewardOnRoute';
import Desafio from "./pages/desafios/desafio.jsx";
import DesafioDetalle from "./pages/desafios/desafioDetalle.jsx";
import MisDesafios from "./pages/desafios/miDesafio.jsx";
import FormPreferencias from "./pages/preferencias/formPreferencias.jsx";
import RankingPage from "./pages/ranking/ranking.jsx";
import AdminUsuarios from "./pages/admin/AdminUsuarios.jsx";
import AdminDesafios from "./pages/admin/AdminDesafios.jsx";

import { Toaster } from "sonner";

import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <RewardOnRoute position="top-center" duration={2400} size="lg" />
          <Toaster position="top-right" richColors closeButton />

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ejercicio/:id" element={<Ejercicio />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/resultado/:id" element={<ResultadoFinal />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/comunidad" element={<Feed />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/perfil/:id_cliente" element={<Perfil />} />
        <Route path="/entrevistas" element={<Oferta />} />
        <Route path="/entrevistas/mis-postulaciones" element={<Postulacion />} />
        <Route path="/entrevistas/oferta/:id" element={<OfertaDetalle />} />
        <Route path="/desafios" element={<Desafio />} />
        <Route path="/mis-desafios" element={<MisDesafios />} />
        <Route path="/desafios/:id" element={<DesafioDetalle />} />
        <Route path="/form-preferencias" element={<FormPreferencias/>}/>
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/adminusuarios" element={<AdminUsuarios />} />
        <Route path="/admindesafios" element={<AdminDesafios />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
