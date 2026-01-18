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
import desafiosRouter from './routes/desafios.js';
import desafioPreguntaRouter from './routes/desafioPregunta.js';
import preguntasRouter from './routes/preguntas.js';
import participanteDesafioRouter from './routes/participanteDesafio.js';
import participantePreguntaRouter from './routes/participantePregunta.js';
import ejercicioComentariosRouter from "./routes/ejercicioComentarios.js";
import ejercicioPistasRouter from "./routes/ejercicioPistas.js";
import historialRouter from "./routes/historial.js";
import ejercicioBugRouter from "./routes/ejercicioBug.js";
import preferenciasRouter from "./routes/preferencias.js";
import recomendacionesRouter from "./routes/recomendaciones.js";
import rankingRouter from "./routes/ranking.js";
import suscripcionRouter from "./routes/suscripcion.js";
import casosPruebaRouter from "./routes/casosPrueba.js";
import authRouter from "./routes/auth.js";
import pagoRouter from "./routes/pago.js";

const app = express(); // Instancia
app.use(cors());
app.use(express.json({
    type: (req) => {
        const contentType = req.headers["content-type"] || "";
        return contentType.includes("application/json");
    }
}));


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
app.use('/desafios', desafiosRouter);
app.use('/desafio-pregunta', desafioPreguntaRouter);
app.use('/preguntas', preguntasRouter);
app.use('/participante-desafio', participanteDesafioRouter);
app.use('/participante-pregunta', participantePreguntaRouter);
app.use("/ejercicio-comentarios", ejercicioComentariosRouter);
app.use("/ejercicio-pistas", ejercicioPistasRouter);
app.use("/historial", historialRouter);
app.use("/ejercicio-bug", ejercicioBugRouter);
app.use("/preferencias", preferenciasRouter);
app.use("/recomendaciones", recomendacionesRouter);
app.use("/ranking", rankingRouter);
app.use("/suscripcion", suscripcionRouter);
app.use("/casos-prueba", casosPruebaRouter); 
app.use("/auth", authRouter);
app.use("/pagos", pagoRouter);

const PORT =  process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
