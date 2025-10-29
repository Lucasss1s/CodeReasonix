import express from "express";
import { checkAndGrantLogros, getLogrosWithProgress } from "../services/logros.js";

const router = express.Router();

/*Verificar y devolver nuevos otorgados */
router.post("/check/:id_cliente", async (req, res) => {
  const id_cliente = Number(req.params.id_cliente);
  if (!id_cliente) return res.status(400).json({ error: "id_cliente requerido" });
  try {
    const nuevos = await checkAndGrantLogros(id_cliente);
    return res.json({ nuevos });
  } catch (e) {
    console.error("[logros.check] error:", e);
    return res.status(500).json({ error: "Error verificando logros" });
  }
});

/*listar logros: desbloqueados + defs con progreso*/
router.get("/me/:id_cliente", async (req, res) => {
  const id_cliente = Number(req.params.id_cliente);
  if (!id_cliente) return res.status(400).json({ error: "id_cliente requerido" });
  try {
    const { obtenidos, defs } = await getLogrosWithProgress(id_cliente);
    return res.json({ obtenidos, defs });
  } catch (e) {
    console.error("[logros.me] error:", e);
    return res.status(500).json({ error: "Error obteniendo logros" });
  }
});

export default router;
