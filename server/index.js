import express from "express"; // Framework para manejar rutas y peticiones HTTP
import cors from "cors";// Permite peticiones de dif dominios (React)
import usuariosRouter from './routes/usuarios.js'; // Modulo usuarios

const app = express(); // Instancia
app.use(cors());
app.use(express.json()); // Parsea cuerpos JSON en las peticiones

// Endpoint
app.get("/", (req, res) => { 
    res.send("Backend funcionandoo");
});
app.use('/usuarios', usuariosRouter);

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`)); // app.listen(PORT, callback)
