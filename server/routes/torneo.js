import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// GET /torneos -> lista todos los torneos
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('torneo')
      .select('*')
      .order('fecha_inicio', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando torneos:', err);
    res.status(500).json({ error: 'Error listando torneos' });
  }
});

// GET /torneos/:id -> obtener torneo
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('torneo')
      .select('*')
      .eq('id_torneo', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo torneo:', err);
    res.status(404).json({ error: 'Torneo no encontrado' });
  }
});

// POST /torneos -> crear torneo
router.post('/', async (req, res) => {
  try {
    let { nombre, fecha_inicio, fecha_fin, estado } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // si no envían fecha_inicio, usamos ahora()
    if (!fecha_inicio) {
      fecha_inicio = new Date().toISOString();
    } else {
      // validamos formato básico
      const d = new Date(fecha_inicio);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'fecha_inicio inválida' });
      fecha_inicio = d.toISOString();
    }

    if (fecha_fin) {
      const df = new Date(fecha_fin);
      if (Number.isNaN(df.getTime())) return res.status(400).json({ error: 'fecha_fin inválida' });
      fecha_fin = df.toISOString();

      // valida lógica mínima: fin >= inicio
      if (new Date(fecha_fin) < new Date(fecha_inicio)) {
        return res.status(400).json({ error: 'fecha_fin debe ser igual o posterior a fecha_inicio' });
      }
    } else {
      fecha_fin = null;
    }

    // por defecto estado = 'activo' si no se envía
    if (!estado) estado = 'activo';

    const payload = {
      nombre,
      fecha_inicio,
      fecha_fin,
      estado
    };

    const { data, error } = await supabase
      .from('torneo')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando torneo:', err);
    res.status(500).json({ error: 'Error creando torneo' });
  }
});

// PUT /torneos/:id -> actualizar torneo
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    let { nombre, fecha_inicio, fecha_fin, estado } = req.body;

    const updatePayload = {};

    if (nombre !== undefined) updatePayload.nombre = nombre;

    if (fecha_inicio !== undefined) {
      const d = new Date(fecha_inicio);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'fecha_inicio inválida' });
      updatePayload.fecha_inicio = d.toISOString();
    }

    if (fecha_fin !== undefined) {
      if (fecha_fin === null) {
        updatePayload.fecha_fin = null;
      } else {
        const df = new Date(fecha_fin);
        if (Number.isNaN(df.getTime())) return res.status(400).json({ error: 'fecha_fin inválida' });
        updatePayload.fecha_fin = df.toISOString();
      }
    }

    if (estado !== undefined) updatePayload.estado = estado;

    // Si envían fechas, comprobamos que no rompan la lógica
    if (updatePayload.fecha_inicio && updatePayload.fecha_fin) {
      if (new Date(updatePayload.fecha_fin) < new Date(updatePayload.fecha_inicio)) {
        return res.status(400).json({ error: 'fecha_fin debe ser igual o posterior a fecha_inicio' });
      }
    } else {
      // Si solo se envía fecha_fin y la base tiene fecha_inicio previa, ideal sería comprobar,
      // pero para mantener simpleza respetamos el update. (Podemos enriquecerlo si querés.)
    }

    const { data, error } = await supabase
      .from('torneo')
      .update(updatePayload)
      .eq('id_torneo', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando torneo:', err);
    res.status(500).json({ error: 'Error actualizando torneo' });
  }
});

// DELETE /torneos/:id -> eliminar torneo (cascada depende de DB)
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase
      .from('torneo')
      .delete()
      .eq('id_torneo', id);
    if (error) throw error;
    res.json({ message: 'Torneo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando torneo:', err);
    res.status(500).json({ error: 'Error eliminando torneo' });
  }
});

export default router;
