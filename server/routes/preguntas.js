import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

const DIFS = new Set(['facil', 'intermedio', 'dificil', 'experto']);
const LENGS = new Set(['java', 'python', 'javascript', 'php']);

function isValidEnum(val, set) {
  return val == null || set.has(String(val));
}

router.get('/', async (req, res) => {
  try {
    const { dificultad, lenguaje } = req.query;

    let q = supabase
      .from('pregunta')
      .select('*')
      .order('id_pregunta', { ascending: true });

    if (dificultad) q = q.eq('dificultad', dificultad);
    if (lenguaje)   q = q.eq('lenguaje', lenguaje);

    const { data, error } = await q;
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
    const { data, error } = await supabase
      .from('pregunta')
      .select('*')
      .eq('id_pregunta', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo pregunta:', err);
    res.status(404).json({ error: 'Pregunta no encontrada' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { texto, opciones, correcta, dificultad = null, lenguaje = null } = req.body;

    if (!texto || !opciones || !correcta) {
      return res.status(400).json({ error: 'texto, opciones y correcta son obligatorios' });
    }
    if (!['A', 'B', 'C', 'D'].includes(correcta)) {
      return res.status(400).json({ error: 'correcta debe ser A, B, C o D' });
    }
    if (!isValidEnum(dificultad, DIFS)) {
      return res.status(400).json({ error: 'dificultad inválida' });
    }
    if (!isValidEnum(lenguaje, LENGS)) {
      return res.status(400).json({ error: 'lenguaje inválido' });
    }

    const payload = { texto, opciones, correcta, dificultad, lenguaje };

    const { data, error } = await supabase
      .from('pregunta')
      .insert([payload])
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
    const { texto, opciones, correcta, dificultad, lenguaje } = req.body;

    const update = {};
    if (texto !== undefined) update.texto = texto;
    if (opciones !== undefined) update.opciones = opciones;

    if (correcta !== undefined) {
      if (!['A', 'B', 'C', 'D'].includes(correcta)) {
        return res.status(400).json({ error: 'correcta debe ser A, B, C o D' });
      }
      update.correcta = correcta;
    }

    if (dificultad !== undefined) {
      if (!isValidEnum(dificultad, DIFS)) {
        return res.status(400).json({ error: 'dificultad inválida' });
      }
      update.dificultad = dificultad;
    }
    if (lenguaje !== undefined) {
      if (!isValidEnum(lenguaje, LENGS)) {
        return res.status(400).json({ error: 'lenguaje inválido' });
      }
      update.lenguaje = lenguaje;
    }

    const { data, error } = await supabase
      .from('pregunta')
      .update(update)
      .eq('id_pregunta', id)
      .select()
      .single();

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
    const { error } = await supabase
      .from('pregunta')
      .delete()
      .eq('id_pregunta', id);
    if (error) throw error;
    res.json({ message: 'Pregunta eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando pregunta:', err);
    res.status(500).json({ error: 'Error eliminando pregunta' });
  }
});

export default router;
