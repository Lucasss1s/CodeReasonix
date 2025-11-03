import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('pregunta').select('*').order('id_pregunta', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando preguntas:', err);
    res.status(500).json({ error: 'Error listando preguntas' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase.from('pregunta').select('*').eq('id_pregunta', id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo pregunta:', err);
    res.status(404).json({ error: 'Pregunta no encontrada' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { texto, opciones, correcta } = req.body;
    if (!texto || !opciones || !correcta) {
      return res.status(400).json({ error: 'texto, opciones y correcta son obligatorios' });
    }
    if (!['A','B','C','D'].includes(correcta)) {
      return res.status(400).json({ error: 'correcta debe ser A, B, C o D' });
    }

    const { data, error } = await supabase
      .from('pregunta')
      .insert([{ texto, opciones, correcta }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando pregunta:', err);
    res.status(500).json({ error: 'Error creando pregunta' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { texto, opciones, correcta } = req.body;
    const update = {};
    if (texto !== undefined) update.texto = texto;
    if (opciones !== undefined) update.opciones = opciones;
    if (correcta !== undefined) {
      if (!['A','B','C','D'].includes(correcta)) return res.status(400).json({ error: 'correcta debe ser A, B, C o D' });
      update.correcta = correcta;
    }

    const { data, error } = await supabase.from('pregunta').update(update).eq('id_pregunta', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando pregunta:', err);
    res.status(500).json({ error: 'Error actualizando pregunta' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase.from('pregunta').delete().eq('id_pregunta', id);
    if (error) throw error;
    res.json({ message: 'Pregunta eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando pregunta:', err);
    res.status(500).json({ error: 'Error eliminando pregunta' });
  }
});

export default router;
