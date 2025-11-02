import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// helper: número de preguntas por participante (fijo 3)
const QUESTIONS_PER_PARTICIPANT = 3;

// POST /participante-desafio  -> inscrbirse
// body: { id_desafio, id_cliente }
router.post('/', async (req, res) => {
  try {
    const { id_desafio, id_cliente } = req.body;
    if (!id_desafio || !id_cliente) return res.status(400).json({ error: 'id_desafio e id_cliente son obligatorios' });

    // 1) Crear participante_desafio si no existe
    const existing = await supabase
      .from('participante_desafio')
      .select('*')
      .eq('id_desafio', Number(id_desafio))
      .eq('id_cliente', Number(id_cliente))
      .limit(1);

    if (existing.error) throw existing.error;
    let participante;
    if (existing.data && existing.data.length > 0) {
      participante = existing.data[0];
    } else {
      const { data: insData, error: insErr } = await supabase
        .from('participante_desafio')
        .insert([{ id_desafio: Number(id_desafio), id_cliente: Number(id_cliente) }])
        .select()
        .single();
      if (insErr) throw insErr;
      participante = insData;
    }

    // 2) asignar N preguntas aleatorias del pool desafio_pregunta (que aún no estén asignadas a este participante)
    // Primero obtenemos ids ya asignados (evitar duplicados)
    const { data: assignedExisting } = await supabase
      .from('participante_pregunta')
      .select('id_desafio_pregunta')
      .eq('id_participante', participante.id_participante);

    const assignedIds = (assignedExisting || []).map(r => Number(r.id_desafio_pregunta));

    // obtener pool de preguntas del desafio
    let q = supabase
      .from('desafio_pregunta')
      .select('*')
      .eq('id_desafio', Number(id_desafio));

    const { data: pool, error: poolErr } = await q;
    if (poolErr) throw poolErr;

    // filtrar los ya asignados al participante
    const available = pool.filter(p => !assignedIds.includes(Number(p.id_desafio_pregunta)));
    if (available.length === 0) {
      return res.json({ message: 'No hay preguntas disponibles para asignar', participante });
    }

    // mezclar y tomar N
    const shuffled = available.sort(() => Math.random() - 0.5);
    const toAssign = shuffled.slice(0, QUESTIONS_PER_PARTICIPANT);

    const inserts = toAssign.map(t => ({
      id_participante: participante.id_participante,
      id_desafio_pregunta: t.id_desafio_pregunta
    }));

    const { data: assignedRows, error: assignErr } = await supabase
      .from('participante_pregunta')
      .insert(inserts)
      .select();

    if (assignErr) throw assignErr;

    // devolver al front las preguntas completas (con texto/opciones)
    const idsDesafioPreg = toAssign.map(t => Number(t.id_desafio_pregunta));
    // join para devolver pregunta
    const { data: preguntasFull, error: pfErr } = await supabase
      .from('desafio_pregunta')
      .select('id_desafio_pregunta, puntos, pregunta(id_pregunta,texto,opciones)')
      .in('id_desafio_pregunta', idsDesafioPreg);

    if (pfErr) throw pfErr;

    res.status(201).json({ participante, preguntas: preguntasFull });
  } catch (err) {
    console.error('Error inscribiendo participante:', err);
    res.status(500).json({ error: 'Error inscribiendo participante' });
  }
});

// GET /participante-desafio/mis/:id_cliente
router.get('/mis/:id_cliente', async (req, res) => {
  const id_cliente = Number(req.params.id_cliente);
  try {
    const { data, error } = await supabase
      .from('participante_desafio')
      .select('*, desafio(id_desafio,nombre,imagen_url,estado,hp_total,hp_restante)')
      .eq('id_cliente', id_cliente)
      .order('fecha_inscripcion', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo mis participaciones:', err);
    res.status(500).json({ error: 'Error obteniendo mis participaciones' });
  }
});

// GET /participante-desafio/por-desafio/:id_desafio
router.get('/por-desafio/:id_desafio', async (req, res) => {
  const id_desafio = Number(req.params.id_desafio);
  try {
    const { data, error } = await supabase
      .from('participante_desafio')
      .select('*, cliente:cliente(id_cliente)')
      .eq('id_desafio', id_desafio)
      .order('fecha_inscripcion', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo participantes por desafío:', err);
    res.status(500).json({ error: 'Error obteniendo participantes por desafío' });
  }
});

export default router;
