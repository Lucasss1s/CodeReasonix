import express from "express"; // Framework para manejar rutas y peticiones HTTP
import cors from "cors"; // Permite peticiones de dif dominios (React)

import usuariosRouter from './routes/usuarios.js'; 
import ejerciciosRouter from './routes/ejercicios.js';
import submitRouter from './routes/submit.js';
import submitFinalRouter from './routes/submitFinal.js';
import publicacionesRouter from "./routes/publicaciones.js";
import comentariosRouter from "./routes/comentarios.js";
import reaccionesRouter from "./routes/reacciones.js";
import feedRouter from "./routes/feed.js";

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
app.use("/publicaciones", publicacionesRouter);
app.use("/comentarios", comentariosRouter);
app.use("/reacciones", reaccionesRouter);
app.use("/feed", feedRouter); 

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
