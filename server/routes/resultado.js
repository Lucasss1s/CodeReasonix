import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// GET /resultados -> lista todos los resultados (con ronda y cliente)
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('resultado')
      .select(`
        id_resultado,
        id_ronda,
        id_cliente,
        puntaje,
        posicion,
        ronda:ronda(id_ronda, numero, torneo:id_torneo),
        cliente:cliente(id_cliente)
      `)
      .order('puntaje', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando resultados:', err);
    res.status(500).json({ error: 'Error listando resultados' });
  }
});

// GET /resultados/:id -> un resultado
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { data, error } = await supabase
      .from('resultado')
      .select('*')
      .eq('id_resultado', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo resultado:', err);
    res.status(404).json({ error: 'Resultado no encontrado' });
  }
});

// POST /resultados -> crear resultado { id_ronda, id_cliente, puntaje, posicion }
router.post('/', async (req, res) => {
  const { id_ronda, id_cliente, puntaje, posicion } = req.body;
  if (!id_ronda || !id_cliente || puntaje == null || posicion == null) {
    return res.status(400).json({ error: 'id_ronda, id_cliente, puntaje y posicion son obligatorios' });
  }

  try {
    const payload = {
      id_ronda: Number(id_ronda),
      id_cliente: Number(id_cliente),
      puntaje: Number(puntaje),
      posicion: Number(posicion)
    };

    const { data, error } = await supabase
      .from('resultado')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando resultado:', err);
    res.status(500).json({ error: 'Error creando resultado' });
  }
});

// PUT /resultados/:id -> actualizar resultado
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { id_ronda, id_cliente, puntaje, posicion } = req.body;

  try {
    const { data, error } = await supabase
      .from('resultado')
      .update({ id_ronda, id_cliente, puntaje, posicion })
      .eq('id_resultado', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando resultado:', err);
    res.status(500).json({ error: 'Error actualizando resultado' });
  }
});

// DELETE /resultados/:id -> eliminar resultado
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase
      .from('resultado')
      .delete()
      .eq('id_resultado', id);
    if (error) throw error;
    res.json({ message: 'Resultado eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando resultado:', err);
    res.status(500).json({ error: 'Error eliminando resultado' });
  }
});

export default router;
