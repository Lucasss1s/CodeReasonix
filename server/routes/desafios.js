import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const { dificultad, lenguaje, incluir_todos } = req.query;

    let q = supabase
      .from('desafio')
      .select('*');

    const incluirTodos =
      incluir_todos === '1' ||
      incluir_todos === 'true' ||
      incluir_todos === 'yes';

    if (!incluirTodos) {
      q = q
        .eq('estado', 'activo')
        .or(`fecha_fin.is.null,fecha_fin.gt.${nowIso}`);
    }

    if (dificultad) q = q.eq('dificultad', dificultad);
    if (lenguaje)   q = q.eq('lenguaje', lenguaje);

    q = q.order('fecha_inicio', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando desafios:', err);
    res.status(500).json({ error: 'Error listando desafíos' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('desafio')
      .select('*')
      .eq('id_desafio', id)
      .single();
    if (error) throw error;

    if (data && (data.hp_restante === null || data.hp_restante === undefined)) {
      data.hp_restante = data.hp_total;
    }
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo desafio:', err);
    res.status(404).json({ error: 'Desafío no encontrado' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      imagen_url,
      fecha_inicio,
      fecha_fin,
      estado,
      hp_total,
      hp_restante,
      recompensa_xp,
      recompensa_moneda,
      dificultad, 
      lenguaje,   
    } = req.body;

    if (!nombre || hp_total == null) {
      return res.status(400).json({ error: 'nombre y hp_total son obligatorios' });
    }

    const payload = {
      nombre,
      descripcion: descripcion ?? null,
      imagen_url: imagen_url ?? null,
      fecha_inicio: fecha_inicio ?? null,
      fecha_fin: fecha_fin ?? null,
      estado: estado ?? 'activo',
      hp_total: Number(hp_total),
      hp_restante: hp_restante != null ? Number(hp_restante) : Number(hp_total),
      recompensa_xp: recompensa_xp ?? 100,
      recompensa_moneda: recompensa_moneda ?? 50,
      dificultad: dificultad ?? null,
      lenguaje: lenguaje ?? null,
    };

    const { data, error } = await supabase
      .from('desafio')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando desafio:', err);
    res.status(500).json({ error: 'Error creando desafío' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const body = req.body ?? {};

    if (body.hp_total !== undefined) body.hp_total = Number(body.hp_total);
    if (body.hp_restante !== undefined) body.hp_restante = Number(body.hp_restante);
    if (body.recompensa_xp !== undefined) body.recompensa_xp = Number(body.recompensa_xp);
    if (body.recompensa_moneda !== undefined) body.recompensa_moneda = Number(body.recompensa_moneda);

    const allowed = new Set([
      'nombre','descripcion','imagen_url','fecha_inicio','fecha_fin','estado',
      'hp_total','hp_restante','recompensa_xp','recompensa_moneda',
      'dificultad','lenguaje'
    ]);
    const update = {};
    Object.keys(body).forEach(k => {
      if (allowed.has(k)) update[k] = body[k];
    });

    const { data, error } = await supabase
      .from('desafio')
      .update(update)
      .eq('id_desafio', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando desafio:', err);
    res.status(500).json({ error: 'Error actualizando desafío' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase
      .from('desafio')
      .delete()
      .eq('id_desafio', id);
    if (error) throw error;
    res.json({ message: 'Desafío eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando desafio:', err);
    res.status(500).json({ error: 'Error eliminando desafío' });
  }
});

export default router;
