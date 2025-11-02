import express from "express"; // Framework para manejar rutas y peticiones HTTP
import cors from "cors"; // Permite peticiones de dif dominios (React)

import usuariosRouter from './routes/usuarios.js'; 
import ejerciciosRouter from './routes/ejercicios.js';
import submitRouter from './routes/submit.js';
import submitFinalRouter from './routes/submitFinal.js';
import codigoGuardadoRouter from './routes/codigoGuardado.js';
import publicacionesRouter from "./routes/publicaciones.js";
import comentariosRouter from "./routes/comentarios.js";
import reaccionesRouter from "./routes/reacciones.js";
import feedRouter from "./routes/feed.js";
import perfilRouter from "./routes/perfil.js";
import gamificacionRoutes from "./routes/gamificacion.js";
import empresaRouter from './routes/empresa.js';
import ofertasRouter from './routes/ofertas.js';
import postulacionesRouter from './routes/postulaciones.js';
import logrosRouter from "./routes/logros.js";
import desafioRouter from './routes/desafios.js';
import preguntaRouter from './routes/preguntas.js';
import desafioPreguntaRouter from './routes/desafioPregunta.js';
import participanteDesafioRouter from './routes/participanteDesafio.js';
import participantePreguntaRouter from './routes/participantePregunta.js';

const app = express(); // Instancia
app.use(cors());
app.use(express.json()); // Parsea cuerpos JSON en las peticiones

// Endpoint base
app.get("/", (req, res) => { 
    res.send("Backend funcionandoo");
});

app.use('/usuarios', usuariosRouter);
app.use('/ejercicios', ejerciciosRouter);  
app.use('/submit', submitRouter);
app.use('/submit-final', submitFinalRouter);
app.use('/codigoGuardado', codigoGuardadoRouter);
app.use("/publicaciones", publicacionesRouter);
app.use("/comentarios", comentariosRouter);
app.use("/reacciones", reaccionesRouter);
app.use("/feed", feedRouter);
app.use("/perfil", perfilRouter);
app.use('/empresas', empresaRouter);
app.use('/ofertas', ofertasRouter);
app.use('/postulaciones', postulacionesRouter);
app.use("/gamificacion", gamificacionRoutes);
app.use("/logros", logrosRouter);
app.use('/desafios', desafioRouter);
app.use('/preguntas', preguntaRouter);
app.use('/desafioPregunta', desafioPreguntaRouter);
app.use('/participanteDesafio', participanteDesafioRouter);
app.use('/participantePregunta', participantePreguntaRouter);

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
