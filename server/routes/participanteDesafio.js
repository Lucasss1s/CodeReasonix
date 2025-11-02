// server/routes/participante_desafio.js
import express from 'express';
import { supabase } from '../config/db.js';

const router = express.Router();

// helper: número de preguntas por inscripción (si querés cada usuario reciba 1 pregunta ahora, cambia a 1)
const QUESTIONS_PER_PARTICIPANT = 1; // <--- según tu último requerimiento: cada usuario puede responder 1

// POST /participante-desafio  -> inscribirse y asignar preguntas
// body: { id_desafio, id_cliente }
router.post('/', async (req, res) => {
  try {
    const { id_desafio, id_cliente } = req.body;

    if (!id_desafio || !id_cliente) {
      return res.status(400).json({ error: 'id_desafio e id_cliente son obligatorios' });
    }

    const idDes = Number(id_desafio);
    const idCli = Number(id_cliente);
    if (Number.isNaN(idDes) || Number.isNaN(idCli)) {
      return res.status(400).json({ error: 'id_desafio e id_cliente deben ser números' });
    }

    const { data: existingRows, error: existingErr } = await supabase
      .from('participante_desafio')
      .select('*')
      .eq('id_desafio', idDes)
      .eq('id_cliente', idCli)
      .limit(1);

    if (existingErr) throw existingErr;

    let participante;
    if (existingRows && existingRows.length > 0) {
      participante = existingRows[0];
    } else {
      const { data: insData, error: insErr } = await supabase
        .from('participante_desafio')
        .insert([{ id_desafio: idDes, id_cliente: idCli }])
        .select()
        .single();
      if (insErr) throw insErr;
      participante = insData;
    }

    // 2) Obtener preguntas ya asignadas a este participante
    const { data: alreadyAssigned, error: assignedErr } = await supabase
      .from('participante_pregunta')
      .select('*')
      .eq('id_participante', participante.id_participante);

    if (assignedErr) throw assignedErr;

    // Si ya tiene preguntas asignadas, devolverlas enriquecidas
    if (alreadyAssigned && alreadyAssigned.length > 0) {
      const preguntasEnriquecidas = await Promise.all(alreadyAssigned.map(async (pp) => {
        // obtener desafio_pregunta para obtener puntos e id_pregunta
        const { data: dp } = await supabase
          .from('desafio_pregunta')
          .select('*')
          .eq('id_desafio_pregunta', pp.id_desafio_pregunta)
          .single();

        // obtener la pregunta
        const { data: p } = await supabase
          .from('pregunta')
          .select('id_pregunta, texto, opciones')
          .eq('id_pregunta', dp.id_pregunta)
          .single();

        return {
          id_participante_pregunta: pp.id_participante_pregunta,
          puntos: dp?.puntos ?? 0,
          pregunta: {
            id_pregunta: p.id_pregunta,
            texto: p.texto,
            opciones: p.opciones
          },
          respondida: pp.respondida,
          correcta: pp.correcta
        };
      }));

      return res.status(200).json({ participante, preguntas: preguntasEnriquecidas });
    }

    // 3) Obtener pool de desafio_pregunta disponibles para este desafio
    const { data: pool, error: poolErr } = await supabase
      .from('desafio_pregunta')
      .select('*')
      .eq('id_desafio', idDes);

    if (poolErr) throw poolErr;

    if (!pool || pool.length === 0) {
      // no hay preguntas en el pool
      return res.status(200).json({ participante, preguntas: [] , message: 'No hay preguntas disponibles para este desafío' });
    }

    // 4) Seleccionar aleatoriamente N preguntas (evitando duplicados, aunque ya no tiene asignadas)
    const shuffled = pool.sort(() => Math.random() - 0.5);
    const toAssign = shuffled.slice(0, QUESTIONS_PER_PARTICIPANT);

    // 5) Insertar filas en participante_pregunta
    const inserts = toAssign.map(t => ({
      id_participante: participante.id_participante,
      id_desafio_pregunta: t.id_desafio_pregunta
    }));

    const { data: assignedRows, error: assignErr } = await supabase
      .from('participante_pregunta')
      .insert(inserts)
      .select();

    if (assignErr) throw assignErr;

    // 6) Enriquecer las filas insertadas con la información de la pregunta (texto, opciones) y puntos
    const preguntasParaFront = await Promise.all(assignedRows.map(async (row) => {
      const { data: dp } = await supabase
        .from('desafio_pregunta')
        .select('*')
        .eq('id_desafio_pregunta', row.id_desafio_pregunta)
        .single();

      const { data: p } = await supabase
        .from('pregunta')
        .select('id_pregunta, texto, opciones')
        .eq('id_pregunta', dp.id_pregunta)
        .single();

      return {
        id_participante_pregunta: row.id_participante_pregunta,
        puntos: dp?.puntos ?? 0,
        pregunta: {
          id_pregunta: p.id_pregunta,
          texto: p.texto,
          opciones: p.opciones
        },
        respondida: row.respondida,
        correcta: row.correcta
      };
    }));

    // 7) Devolver participante y preguntas asignadas
    return res.status(201).json({ participante, preguntas: preguntasParaFront });

  } catch (err) {
    console.error('Error inscribiendo participante:', err);
    res.status(500).json({ error: 'Error inscribiendo participante' });
  }
});

// GET /participante-desafio/mis/:id_cliente  (ya tenías esto, lo dejamos)
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

export default router;
