import express from "express"; // Framework para manejar rutas y peticiones HTTP
import cors from "cors";// Permite peticiones de dif dominios (React)

const app = express(); // Instancia
app.use(cors());
app.use(express.json()); // Parsea cuerpos JSON en las peticiones

app.get("/", (req, res) => { // Endpoint verificacion
    res.send("Backend funcionandoo");
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`)); // app.listen(PORT, callback)
