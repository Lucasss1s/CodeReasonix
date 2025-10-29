import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// GET /rondas -> lista todas las rondas (con info del torneo)
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('ronda')
      .select('*, torneo:torneo(id_torneo, nombre)')
      .order('id_ronda', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando rondas:', err);
    res.status(500).json({ error: 'Error listando rondas' });
  }
});

// GET /rondas/:id -> una ronda
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('ronda')
      .select('*, torneo:torneo(id_torneo, nombre)')
      .eq('id_ronda', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo ronda:', err);
    res.status(404).json({ error: 'Ronda no encontrada' });
  }
});

// POST /rondas -> crear ronda { id_torneo, numero }
router.post('/', async (req, res) => {
  const { id_torneo, numero } = req.body;
  if (!id_torneo || numero == null) {
    return res.status(400).json({ error: 'id_torneo y numero son obligatorios' });
  }

  try {
    const payload = {
      id_torneo: Number(id_torneo),
      numero: Number(numero),
    };

    const { data, error } = await supabase
      .from('ronda')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando ronda:', err);
    res.status(500).json({ error: 'Error creando ronda' });
  }
});

// PUT /rondas/:id -> actualizar ronda
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { id_torneo, numero } = req.body;

  try {
    const { data, error } = await supabase
      .from('ronda')
      .update({ id_torneo, numero })
      .eq('id_ronda', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando ronda:', err);
    res.status(500).json({ error: 'Error actualizando ronda' });
  }
});

// DELETE /rondas/:id -> eliminar ronda
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase
      .from('ronda')
      .delete()
      .eq('id_ronda', id);
    if (error) throw error;
    res.json({ message: 'Ronda eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando ronda:', err);
    res.status(500).json({ error: 'Error eliminando ronda' });
  }
});

export default router;
