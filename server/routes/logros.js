import express from "express";
import { checkAndGrantLogros } from "../services/logros.js";
import { supabase } from "../config/db.js";

const router = express.Router();

/*Verificar*/
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

/*devuelve logros*/
router.get("/me/:id_cliente", async (req, res) => {
  const id_cliente = Number(req.params.id_cliente);
  if (!id_cliente) return res.status(400).json({ error: "id_cliente requerido" });

  try {
    const { data: obtenidos } = await supabase
      .from("usuario_logro")
      .select("id_logro, fecha_otorgado, logro( id_logro, titulo, descripcion, icono, xp_otorgado, activo )")
      .eq("id_cliente", id_cliente)
      .order("fecha_otorgado", { ascending: false });

    const lista = (obtenidos || []).map((u) => ({
      id_logro: u.id_logro,
      fecha_otorgado: u.fecha_otorgado,
      ...u.logro,
    }));

    const { data: defs } = await supabase
      .from("logro")
      .select("*")
      .eq("activo", true);

    return res.json({ obtenidos: lista, defs: defs || [] });
  } catch (e) {
    console.error("[logros.me] error:", e);
    return res.status(500).json({ error: "Error obteniendo logros" });
  }
});

export default router;
