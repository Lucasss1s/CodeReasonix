import express from "express";
import { supabase } from "../config/db.js";
import { requireSesion } from '../middlewares/requireSesion.js';

const router = express.Router();

router.get("/:id_ejercicio", requireSesion,  async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  const { id_ejercicio } = req.params;

  try {
    //Comentarios del ejercicio
    const { data: comentarios, error: e1 } = await supabase
      .from("ejercicio_comentario")
      .select("*")
      .eq("id_ejercicio", id_ejercicio)
      .order("fecha", { ascending: true });

    if (e1) throw e1;

  const idsComentarios = comentarios.map(function(comentario) {
      return comentario.id_comentario;
  });
  const allIdsClientes = comentarios.map(function(comentario) {
      return comentario.id_cliente;
  });
  const idsClientes = Array.from(new Set(allIdsClientes));

    //Reacciones por comentario
    const { data: reaccionesData, error: e2 } = await supabase
      .from("ejercicio_comentario_reaccion")
      .select("id_comentario, id_cliente, tipo, fecha")
      .in("id_comentario", idsComentarios);

    if (e2) throw e2;
    const reacciones = reaccionesData || [];

    //Formato para front
    const { data: clientesData, error: e3 } = await supabase
      .from("cliente")
      .select(`
        id_cliente,
        usuario (
          id_usuario,
          nombre,
          email
        )
      `)
      .in("id_cliente", idsClientes);

    if (e3) throw e3;
    const clientes = clientesData || [];

    const clienteMap = Object.fromEntries(
      clientes.map(c => [c.id_cliente, c])
    );

    const reaccionesMap = reacciones.reduce((acc, r) => {
      if (!acc[r.id_comentario]) {
        acc[r.id_comentario] = [];
      }
      acc[r.id_comentario].push(r);
      return acc;
    }, {});


    const enriched = comentarios.map(c => ({
      ...c,
      cliente: clienteMap[c.id_cliente] || null,
      reacciones: reaccionesMap[c.id_comentario] || [],
      es_mio: Number(c.id_cliente) === Number(id_cliente),
    }));

    return res.json(enriched);
  } catch (err) {
    console.error("[COMENTARIOS] list fail:", err);
    return res.status(500).json({ error: "Error cargando comentarios" });
  } 
});


router.post("/:id_ejercicio", requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  const { id_ejercicio } = req.params;
  const { contenido, parent_id = null } = req.body;

  try {
    const { data, error } = await supabase
      .from("ejercicio_comentario")
      .insert([
        {
          id_ejercicio: id_ejercicio,
          id_cliente,
          contenido,
          parent_id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("[COMENTARIOS] create fail:", err);
    res.status(500).json({ error: "Error creando comentario" });
  }
});


router.put(":id_comentario", async (req, res) => {
  const { id_comentario } = req.params;
  const { contenido } = req.body;

  try {
    const { data, error } = await supabase
      .from("ejercicio_comentario")
      .update({ contenido })
      .eq("id_comentario", id_comentario)
      .select()
      .single();

    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error("[COMENTARIOS] update fail:", err);
    res.status(500).json({ error: "Error actualizando comentario" });
  }
});


router.delete("/:id_comentario", requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  const { id_comentario } = req.params;

  try {
    const { data: row, error: e1 } = await supabase
      .from("ejercicio_comentario")
      .select("id_cliente")
      .eq("id_comentario", id_comentario)
      .maybeSingle();

    if (e1) throw e1;
    if (!row) return res.status(404).json({ error: "Comentario no encontrado" });

    const ownerId = Number(row.id_cliente);
    if (ownerId !== id_cliente) {
      return res.status(403).json({ error: "No sos el autor de este comentario" });
    }

    //Check respuestas
    const { count, error: e2 } = await supabase
      .from("ejercicio_comentario")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", id_comentario);
      
    if (e2) throw e2;

    // Soft delete si tiene replies
    if ((count || 0) > 0) {
      const { data: up, error: e3 } = await supabase
        .from("ejercicio_comentario")
        .update({ contenido: "🗑️ [Comentario eliminado por su autor]" })
        .eq("id_comentario", id_comentario)
        .select()
        .single();

      if (e3) throw e3;

      return res.json({ softDeleted: true, data: up });
    }

    // Hard delete si no tiene replies
    const { error: e4 } = await supabase
      .from("ejercicio_comentario")
      .delete()
      .eq("id_comentario", id_comentario);

    if (e4) throw e4;

    return res.json({ deleted: true });
  } catch (err) {
    console.error("[COMENTARIOS] delate fail:", err);
    return res.status(500).json({ error: "Error borrando comentario" });
  }
});


router.post("/:id_comentario/reaccion", requireSesion, async (req, res) => {
  const id_cliente = req.cliente.id_cliente;
  const { id_comentario } = req.params;
  const { tipo = "like" } = req.body;

  try {
    const { data: comentario, error: e1 } = await supabase
      .from("ejercicio_comentario")
      .select("id_ejercicio")
      .eq("id_comentario", id_comentario)
      .maybeSingle();

    if (e1) throw e1;
    if (!comentario) {
      return res.status(404).json({ error: "Comentario no encontrado" });
    }

    const id_ejercicio = comentario.id_ejercicio;

    // Existe reaccion
    const { data: exist, error: e2 } = await supabase
      .from("ejercicio_comentario_reaccion")
      .select("tipo")
      .eq("id_comentario", id_comentario)
      .eq("id_cliente", id_cliente)
      .maybeSingle();

    if (e2) throw e2;

    if (!exist) {
      const { data, error: e3 } = await supabase
        .from("ejercicio_comentario_reaccion")
        .insert([{ id_ejercicio, id_comentario, id_cliente, tipo }])
        .select()
        .single();

      if (e3) throw e3;

      return res.json({ action: "added", data });
    }

    //Mismo tipo: toggle
    if (exist.tipo === tipo) {
      const { error: e4 } = await supabase
        .from("ejercicio_comentario_reaccion")
        .delete()
        .eq("id_comentario", id_comentario)
        .eq("id_cliente", id_cliente);

      if (e4) throw e4;

      return res.json({ action: "removed" });
    }

    // Existe: actualizar
    const { data: updated, error: e5 } = await supabase
      .from("ejercicio_comentario_reaccion")
      .update({ tipo })
      .eq("id_comentario", id_comentario)
      .eq("id_cliente", id_cliente)
      .select()
      .single();

    if (e5) throw e5;

    return res.json({ action: "updated", data: updated });
  } catch (err) {
    console.error("[REACCION] fail:", err);
    return res.status(500).json({ error: "Error reaccionando comentario" });
  }
});


router.get("/:id_ejercicio/count", requireSesion, async (req, res) => {
  const { id_ejercicio } = req.params;

  try {
    const { count, error } = await supabase
      .from("ejercicio_comentario")
      .select("*", { count: "exact", head: true })
      .eq("id_ejercicio", id_ejercicio);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (err) {
    console.error("[REACCION] count fail:", err);
    res.status(500).json({ error: "Error contando comentarios" });
  }
});


export default router;
