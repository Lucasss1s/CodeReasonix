import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { desafio } = req.query;
    let q = supabase.from('desafio_pregunta').select('*, pregunta(*)');
    if (desafio) q = q.eq('id_desafio', Number(desafio));
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error listando desafio_pregunta:', err);
    res.status(500).json({ error: 'Error listando desafío_pregunta' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id_desafio, id_pregunta, puntos } = req.body;
    if (!id_desafio || !id_pregunta) return res.status(400).json({ error: 'id_desafio e id_pregunta son obligatorios' });

    const payload = { id_desafio: Number(id_desafio), id_pregunta: Number(id_pregunta), puntos: puntos ?? 10 };
    const { data, error } = await supabase.from('desafio_pregunta').insert([payload]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Error creando desafio_pregunta:', err);
    res.status(500).json({ error: 'Error creando desafio_pregunta' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const { error } = await supabase.from('desafio_pregunta').delete().eq('id_desafio_pregunta', id);
    if (error) throw error;
    res.json({ message: 'Asociación pregunta-desafío eliminada' });
  } catch (err) {
    console.error('Error eliminando desafio_pregunta:', err);
    res.status(500).json({ error: 'Error eliminando desafio_pregunta' });
  }
});

export default router;
