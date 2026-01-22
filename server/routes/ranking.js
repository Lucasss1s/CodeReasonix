import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from "../middlewares/requireSesion.js";

const router = express.Router();

// helpers
function mapearFilasRanking(filas) {
  return (filas || []).map((fila, i) => ({
    posicion: i + 1,
    ...fila,
  }));
}

async function obtenerRankingTop({vista,columnasSelect,colXp,colResueltos,colUltima,limite = 50}) {
  const { data, error } = await supabase
    .from(vista)
    .select(columnasSelect)
    .or(`${colXp}.gt.0,${colResueltos}.gt.0`)
    .order(colXp, { ascending: false })
    .order(colResueltos, { ascending: false })
    .order(colUltima, { ascending: false, nullsFirst: false })
    .limit(limite);

  if (error) throw error;
  return mapearFilasRanking(data);
}

async function obtenerMiPosicion({vista,columnasSelect,colXp,colResueltos,colUltima,id_cliente }) {
  const { data, error } = await supabase
    .from(vista)
    .select(columnasSelect)
    .or(`${colXp}.gt.0,${colResueltos}.gt.0`)
    .order(colXp, { ascending: false })
    .order(colResueltos, { ascending: false })
    .order(colUltima, { ascending: false, nullsFirst: false });

  if (error) throw error;

  const lista = data || [];
  if (lista.length === 0) return null;

  const indice = lista.findIndex(
    (fila) => String(fila.id_cliente) === String(id_cliente)
  );
  if (indice === -1) return null;

  return { posicion: indice + 1, ...lista[indice] };
}

router.get("/global", requireSesion, async (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limit) || 50, 100);

    const ranking = await obtenerRankingTop({
      vista: "vw_ranking_global",
      columnasSelect: "id_cliente, nombre, email, nivel, xp_total, desafios_resueltos, ultima_actividad",
      colXp: "xp_total",
      colResueltos: "desafios_resueltos",
      colUltima: "ultima_actividad",
      limite,
    });

    res.json({ ranking });
  } catch (err) {
    console.error("Error en ranking global:", err);
    res.status(500).json({ error: "Error en ranking global" });
  }
});

router.get("/semanal", requireSesion, async (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limit) || 50, 100);

    const ranking = await obtenerRankingTop({
      vista: "vw_ranking_semanal",
      columnasSelect: "id_cliente, nombre, email, nivel, xp_total, xp_semana, desafios_semana, ultima_actividad_semana",
      colXp: "xp_semana",
      colResueltos: "desafios_semana",
      colUltima: "ultima_actividad_semana",
      limite,
    });

    res.json({ ranking });
  } catch (err) {
    console.error("Error en ranking semanal:", err);
    res.status(500).json({ error: "Error en ranking semanal" });
  }
});

router.get("/hoy", requireSesion, async (req, res) => {
  try {
    const limite = Math.min(Number(req.query.limit) || 50, 100);

    const ranking = await obtenerRankingTop({
      vista: "vw_ranking_hoy",
      columnasSelect: "id_cliente, nombre, email, nivel, xp_total, xp_hoy, desafios_hoy, ultima_actividad_hoy",
      colXp: "xp_hoy",
      colResueltos: "desafios_hoy",
      colUltima: "ultima_actividad_hoy",
      limite,
    });

    res.json({ ranking });
  } catch (err) {
    console.error("Error en ranking de hoy:", err);
    res.status(500).json({ error: "Error en ranking de hoy" });
  }
});

router.get("/me", requireSesion,  async (req, res) => {
  const  id_cliente  = req.cliente.id_cliente;
  if (!id_cliente)
    return res.status(400).json({ error: "id_cliente obligatorio" });

  try {
    const miPosicion = await obtenerMiPosicion({
      vista: "vw_ranking_global",
      columnasSelect: "id_cliente, nombre, email, nivel, xp_total, desafios_resueltos, ultima_actividad",
      colXp: "xp_total",
      colResueltos: "desafios_resueltos",
      colUltima: "ultima_actividad",
      id_cliente,
    });

    if (!miPosicion)
      return res.status(404).json({ error: "Usuario sin ranking todavia" });

    res.json(miPosicion);
  } catch (err) {
    console.error("Error en mi ranking global:", err);
    res.status(500).json({ error: "Error en mi posición global" });
  }
});

router.get("/me/semanal", requireSesion,  async (req, res) => {
  const  id_cliente  = req.cliente.id_cliente;
  if (!id_cliente)
    return res.status(400).json({ error: "id_cliente obligatorio" });

  try {
    const miPosicion = await obtenerMiPosicion({
      vista: "vw_ranking_semanal",
      columnasSelect: "id_cliente, nombre, email, nivel, xp_total, xp_semana, desafios_semana, ultima_actividad_semana",
      colXp: "xp_semana",
      colResueltos: "desafios_semana",
      colUltima: "ultima_actividad_semana",
      id_cliente,
    });

    if (!miPosicion)
      return res.status(404).json({ error: "Usuario sin ranking semanal todavia" });

    res.json(miPosicion);
  } catch (err) {
    console.error("Error en mi ranking semanal:", err);
    res.status(500).json({ error: "Error en mi posición semanal" });
  }
});

router.get("/me/hoy", requireSesion,  async (req, res) => {
  const id_cliente  = req.cliente.id_cliente;
  if (!id_cliente)
    return res.status(400).json({ error: "id_cliente obligatorio" });

  try {
    const miPosicion = await obtenerMiPosicion({
      vista: "vw_ranking_hoy",
      columnasSelect: "id_cliente, nombre, email, nivel, xp_total, xp_hoy, desafios_hoy, ultima_actividad_hoy",
      colXp: "xp_hoy",
      colResueltos: "desafios_hoy",
      colUltima: "ultima_actividad_hoy",
      id_cliente,
    });

    if (!miPosicion)
      return res.status(404).json({ error: "Usuario sin ranking hoy todavia"});

    res.json(miPosicion);
  } catch (err) {
    console.error("Error en mi ranking hoy:", err);
    res.status(500).json({ error: "Error en mi posicion de hoy"});
  }
});

export default router;
