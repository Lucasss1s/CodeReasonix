import express from "express";
import { supabase } from "../config/db.js";

const router = express.Router();

router.get("/:id_ejercicio/comentarios", async (req, res) => {
  const { id_ejercicio } = req.params;

  try {
    //Comentarios del ejercicio
    const { data: comentarios, error: e1 } = await supabase
      .from("ejercicio_comentario")
      .select("*")
      .eq("id_ejercicio", id_ejercicio)
      .order("fecha", { ascending: true });
    if (e1) throw e1;

    const idsComentarios = comentarios.map(c => c.id_comentario);
    const idsClientes = [...new Set(comentarios.map(c => c.id_cliente))];

    //Reacciones por comentario
    let reacciones = [];
    if (idsComentarios.length) {
      const { data: rea, error: e2 } = await supabase
        .from("ejercicio_comentario_reaccion")
        .select("id_comentario, id_cliente, tipo, fecha")
        .in("id_comentario", idsComentarios);
      if (e2) throw e2;
      reacciones = rea || [];
    }

    //Cliente
    let clientes = [];
    if (idsClientes.length) {
      const { data: cli, error: e3 } = await supabase
        .from("cliente")
        .select("id_cliente, id_usuario")
        .in("id_cliente", idsClientes);
      if (e3) throw e3;

      const idsUsuarios = [...new Set((cli || []).map(x => x.id_usuario).filter(Boolean))];
      let usuarios = [];
      if (idsUsuarios.length) {
        const { data: usr, error: e4 } = await supabase
          .from("usuario")
          .select("id_usuario, nombre, email")
          .in("id_usuario", idsUsuarios);
        if (e4) throw e4;
        usuarios = usr || [];
      }
      const uMap = Object.fromEntries(usuarios.map(u => [u.id_usuario, u]));
      clientes = (cli || []).map(c => ({
        id_cliente: c.id_cliente,
        usuario: uMap[c.id_usuario] || null,
      }));
    }

    //Arbol
    const reacByComment = reacciones.reduce((acc, r) => {
      (acc[r.id_comentario] ||= []).push({
        id_cliente: r.id_cliente, tipo: r.tipo, fecha: r.fecha
      });
      return acc;
    }, {});
    const clientMap = Object.fromEntries(clientes.map(c => [c.id_cliente, c]));

    const enriched = comentarios.map(c => ({
      ...c,
      reacciones: reacByComment[c.id_comentario] || [],
      cliente: clientMap[c.id_cliente] || null,
    }));

    const byId = {};
    enriched.forEach(c => (byId[c.id_comentario] = { ...c, replies: [] }));
    const roots = [];
    enriched.forEach(c => {
      if (c.parent_id && byId[c.parent_id]) {
        byId[c.parent_id].replies.push(byId[c.id_comentario]);
      } else {
        roots.push(byId[c.id_comentario]);
      }
    });

    //res.json(roots);
    return res.json(enriched);
  } catch (err) {
    console.error("Error cargando comentarios:", err?.message, err);
    res.status(500).json({ error: "Error cargando comentarios", details: err?.message || null });
  }
});


router.post("/:id_ejercicio/comentarios", async (req, res) => {
  const { id_ejercicio } = req.params;
  const { id_cliente, contenido, parent_id = null } = req.body;

  if (!id_cliente || !contenido) {
    return res.status(400).json({ error: "id_cliente y contenido son obligatorios" });
  }

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
    console.error("Error creando comentario:", err);
    res.status(500).json({ error: "Error creando comentario" });
  }
});


router.put("/comentarios/:id_comentario", async (req, res) => {
  const { id_comentario } = req.params;
  const { contenido } = req.body;

  if (!contenido) return res.status(400).json({ error: "contenido requerido" });

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
    console.error("Error actualizando comentario:", err);
    res.status(500).json({ error: "Error actualizando comentario" });
  }
});


router.delete("/comentarios/:id_comentario", async (req, res) => {
  const { id_comentario } = req.params;

  const rawId =
    (req.body && req.body.id_cliente) ??
    req.header("x-client-id") ??
    req.query.id_cliente;

  const requesterId = Number(rawId);
  if (!Number.isFinite(requesterId)) {
    return res.status(400).json({ error: "id_cliente inválido" });
  }

  try {
    //Validar autor
    const { data: row, error: e1 } = await supabase
      .from("ejercicio_comentario")
      .select("id_cliente")
      .eq("id_comentario", id_comentario)
      .maybeSingle();

    if (e1) throw e1;
    if (!row) return res.status(404).json({ error: "Comentario no encontrado" });

    const ownerId = Number(row.id_cliente);
    if (!Number.isFinite(ownerId) || ownerId !== requesterId) {
      return res.status(403).json({ error: "No sos el autor de este comentario" });
    }

    const { count, error: e2 } = await supabase
      .from("ejercicio_comentario")
      .select("*", { count: "exact", head: true })
      .eq("parent_id", id_comentario);
    if (e2) throw e2;

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

    const { error: e4 } = await supabase
      .from("ejercicio_comentario")
      .delete()
      .eq("id_comentario", id_comentario);
    if (e4) throw e4;

    return res.json({ deleted: true });
  } catch (err) {
    console.error("Error borrando comentario:", err);
    return res.status(500).json({ error: "Error borrando comentario", details: err?.message });
  }
});


router.post("/comentarios/:id_comentario/reaccion", async (req, res) => {
  const { id_comentario } = req.params;
  const { id_cliente, tipo = "like" } = req.body;

  if (!id_cliente) return res.status(400).json({ error: "id_cliente requerido" });

  try {
    //lookup comentario 
    const { data: comentario, error: errCom } = await supabase
      .from("ejercicio_comentario")
      .select("id_ejercicio")
      .eq("id_comentario", id_comentario)
      .maybeSingle();

    if (errCom) {
      console.error("[REACTION] error lookup comentario:", errCom);
      return res.status(500).json({ error: "No se pudo resolver el ejercicio del comentario", details: errCom.message });
    }
    if (!comentario) return res.status(404).json({ error: "Comentario no encontrado" });

    const id_ejercicio = comentario.id_ejercicio;

    //exist?
    const { data: exist, error: errEx } = await supabase
      .from("ejercicio_comentario_reaccion")
      .select("*")
      .eq("id_comentario", id_comentario)
      .eq("id_cliente", id_cliente)
      .maybeSingle();

    if (errEx) {
      console.error("[REACTION] error checking exist:", errEx);
      return res.status(500).json({ error: "No se pudo verificar reacción existente", details: errEx.message });
    }

    //insert/ update
    if (!exist) {
      const { data, error } = await supabase
        .from("ejercicio_comentario_reaccion")
        .insert([{ id_ejercicio, id_comentario, id_cliente, tipo }])
        .select()
        .single();

      if (error) {
        console.error("[REACTION] insert fail:", { payload: { id_ejercicio, id_comentario, id_cliente, tipo } }, error);
        return res.status(500).json({ error: "No se pudo insertar la reacción", details: error.message });
      }
      return res.json({ action: "added", data });
    }

    if (exist.tipo === tipo) {
      const { error: errDel } = await supabase
        .from("ejercicio_comentario_reaccion")
        .delete()
        .eq("id_comentario", id_comentario)
        .eq("id_cliente", id_cliente);

      if (errDel) {
        console.error("[REACTION] delete fail:", errDel);
        return res.status(500).json({ error: "No se pudo quitar la reacción", details: errDel.message });
      }
      return res.json({ action: "removed" });
    }

    const { data: updated, error: errUpd } = await supabase
      .from("ejercicio_comentario_reaccion")
      .update({ tipo })
      .eq("id_comentario", id_comentario)
      .eq("id_cliente", id_cliente)
      .select()
      .single();

    if (errUpd) {
      console.error("[REACTION] update fail:", errUpd);
      return res.status(500).json({ error: "No se pudo cambiar la reacción", details: errUpd.message });
    }

    return res.json({ action: "updated", data: updated });
  } catch (err) {
    console.error("[REACTION] unexpected:", err);
    return res.status(500).json({ error: "Error reaccionando comentario", details: err?.message });
  }
});


router.get("/:id_ejercicio/count", async (req, res) => {
  const { id_ejercicio } = req.params;
  try {
    const { count, error } = await supabase
      .from("ejercicio_comentario")
      .select("*", { count: "exact", head: true })
      .eq("id_ejercicio", id_ejercicio);

    if (error) throw error;
    res.json({ count: count || 0 });
  } catch (err) {
    console.error("Error count comentarios:", err);
    res.status(500).json({ error: "Error contando comentarios", details: err?.message });
  }
});


export default router;
