import express from "express";
import { checkAndGrantLogros, getLogrosWithProgress } from "../services/logros.js";
import { supabase } from "../config/db.js";

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

//Condiciones existentes 
router.get("/condiciones-soportadas", (req, res) => {
  return res.json([
    {
      tipo: "login",
      label: "Inicios de sesión",
      params: [
        { key: "veces", type: "number", min: 1 }
      ]
    },
    {
      tipo: "streak",
      label: "Racha diaria",
      params: [
        { key: "dias", type: "number", min: 1 }
      ]
    },
    {
      tipo: "ejercicio_resuelto", 
      label: "Ejercicios resueltos",
      params: [
        { key: "cantidad", type: "number", min: 1 }
      ]
    },
    {
      tipo: "nivel",
      label: "Nivel alcanzado",
      params: [
        { key: "valor", type: "number", min: 1 }
      ]
    }
  ]);
});

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("logro")
      .select("*")
      .order("id_logro", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("[logros.list] error:", e);
    res.status(500).json({ error: "No se pudieron obtener los logros" });
  }
});

router.post("/", async (req, res) => {
  const { titulo, descripcion, condicion, xp_otorgado = 0, icono = null, activo = true } = req.body;

  if (!titulo || !condicion?.tipo) {
    return res.status(400).json({ error: "titulo y condicion.tipo son requeridos" });
  }

  try {
    const { data, error } = await supabase
      .from("logro")
      .insert({ titulo, descripcion, condicion, xp_otorgado, icono, activo })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    console.error("[logros.create] error:", e);
    res.status(500).json({ error: "No se pudo crear el logro" });
  }
});

router.put("/:id_logro", async (req, res) => {
  const id_logro = Number(req.params.id_logro);
  if (!id_logro) {
    return res.status(400).json({ error: "id_logro inválido" });
  }

  const {titulo, descripcion, condicion, xp_otorgado, icono, activo } = req.body;

  try {
    const { data, error } = await supabase
      .from("logro")
      .update({ titulo, descripcion, condicion, xp_otorgado, icono, activo})
      .eq("id_logro", id_logro)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("[logros.update] error:", e);
    res.status(500).json({ error: "No se pudo actualizar el logro" });
  }
});

router.patch("/:id_logro/activo", async (req, res) => {
  const id_logro = Number(req.params.id_logro);
  const { activo } = req.body;

  if (!id_logro || typeof activo !== "boolean") {
    return res.status(400).json({ error: "id_logro y activo(boolean) requeridos" });
  }

  try {
    const { error } = await supabase
      .from("logro")
      .update({ activo })
      .eq("id_logro", id_logro);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error("[logros.toggle] error:", e);
    res.status(500).json({ error: "No se pudo cambiar el estado del logro" });
  }
});


export default router;
