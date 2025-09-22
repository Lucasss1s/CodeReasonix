import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/index.jsx';
import Ejercicio from './pages/ejercicios/ejercicio.jsx';
import Register from './pages/usuarios/register.jsx';
import Login from './pages/usuarios/login.jsx'; 
import ResultadoFinal from './pages/ejercicios/resultadoFinal.jsx'
import Logout from "./pages/usuarios/logout.jsx";
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ejercicio/:id" element={<Ejercicio />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/resultado/:id" element={ <ResultadoFinal/> } />
        <Route path="/logout" element={<Logout/>}/>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
