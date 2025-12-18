import express from 'express';
import { supabase } from '../config/db.js';
import { nivelDesdeXP } from '../services/gamificacion.js';
import { otorgarMonedas } from '../services/monedas.js';

const router = express.Router();

// helper: número de preguntas por inscripción cambiar el 2 para mas preguntas
const QUESTIONS_PER_PARTICIPANT = 2;

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

    const { data: alreadyAssigned, error: assignedErr } = await supabase
      .from('participante_pregunta')
      .select('*')
      .eq('id_participante', participante.id_participante);

    if (assignedErr) throw assignedErr;

    if (alreadyAssigned && alreadyAssigned.length > 0) {
      const preguntasEnriquecidas = await Promise.all(alreadyAssigned.map(async (pp) => {
        const { data: dp } = await supabase
          .from('desafio_pregunta')
          .select('*')
          .eq('id_desafio_pregunta', pp.id_desafio_pregunta)
          .single();

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

    const { data: pool, error: poolErr } = await supabase
      .from('desafio_pregunta')
      .select('*')
      .eq('id_desafio', idDes);

    if (poolErr) throw poolErr;

    if (!pool || pool.length === 0) {
      return res.status(200).json({ participante, preguntas: [], message: 'No hay preguntas disponibles' });
    }

    const shuffled = pool.sort(() => Math.random() - 0.5);
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

    return res.status(201).json({ participante, preguntas: preguntasParaFront });

  } catch (err) {
    console.error('Error inscribiendo participante:', err);
    res.status(500).json({ error: 'Error inscribiendo participante' });
  }
});

router.get('/mis/:id_cliente', async (req, res) => {
  const id_cliente = Number(req.params.id_cliente);
  try {
    const { data, error } = await supabase
      .from('participante_desafio')
      .select(`
        *,
        desafio (
          id_desafio,
          nombre,
          imagen_url,
          estado,
          hp_total,
          hp_restante,
          recompensa_xp,
          recompensa_moneda,
          dificultad,
          lenguaje
        )
      `)
      .eq('id_cliente', id_cliente)
      .order('fecha_inscripcion', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo mis participaciones:', err);
    res.status(500).json({ error: 'Error obteniendo mis participaciones' });
  }
});

router.post('/:id_participante/claim', async (req, res) => {
  try {
    const id_part = Number(req.params.id_participante);
    if (Number.isNaN(id_part)) {
      return res.status(400).json({ error: 'id_participante inválido' });
    }

    const { data: partRow, error: partErr } = await supabase
      .from('participante_desafio')
      .select(`
        *,
        desafio(id_desafio, estado, recompensa_xp, recompensa_moneda)
      `)
      .eq('id_participante', id_part)
      .single();

    if (partErr || !partRow) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    if (!['finalizado', 'finalizando'].includes(String(partRow.desafio.estado))) {
      return res.status(400).json({ error: 'El desafío aún no está finalizado' });
    }

    if (partRow.recibio_recompensa) {
      return res.status(400).json({ error: 'Recompensa ya reclamada' });
    }

    const respondidas = Number(partRow.respondidas || 0);
    const aciertos = Number(partRow.aciertos || 0);

    if (respondidas === 0) {
      await supabase
        .from('participante_desafio')
        .update({ recibio_recompensa: true })
        .eq('id_participante', id_part);

      return res.json({
        message: 'No recibiste recompensa porque no participaste del desafío',
        xp: 0,
        monedas: 0
      });
    }

    const factor = aciertos / QUESTIONS_PER_PARTICIPANT;

    const xpBase = Number(partRow.desafio.recompensa_xp || 0);
    const monedaBase = Number(partRow.desafio.recompensa_moneda || 0);

    const xpToGive = Math.floor(xpBase * factor);
    const monedaToGive = Math.floor(monedaBase * factor);

    const id_cliente = partRow.id_cliente;

    let xpResult = { xp_otorgado: 0, xp_total: null, nivel: null };

    if (xpToGive > 0) {
      const { data: uxRow } = await supabase
        .from('usuario_xp')
        .select('xp_total')
        .eq('id_cliente', id_cliente)
        .maybeSingle();

      const nuevoTotal = (uxRow?.xp_total ?? 0) + xpToGive;
      const nuevoNivel = nivelDesdeXP(nuevoTotal);

      await supabase.from('usuario_xp').upsert({
        id_cliente,
        xp_total: nuevoTotal,
        nivel: nuevoNivel,
        ultima_actualizacion: new Date()
      }, { onConflict: 'id_cliente' });

      xpResult = {
        xp_otorgado: xpToGive,
        xp_total: nuevoTotal,
        nivel: nuevoNivel
      };
    }

    const monedasResult = monedaToGive > 0
      ? await otorgarMonedas({
          id_cliente,
          cantidad: monedaToGive,
          motivo: { tipo: 'desafio', id_desafio: partRow.desafio.id_desafio }
        })
      : { monedas_otorgadas: 0, monedas_total: null };

    await supabase
      .from('participante_desafio')
      .update({ recibio_recompensa: true })
      .eq('id_participante', id_part);

    return res.json({
      message: 'Recompensa reclamada correctamente',
      aciertos,
      respondidas,
      factor,
      xp: xpResult.xp_otorgado,
      xp_total: xpResult.xp_total,
      nivel: xpResult.nivel,
      monedas: monedasResult.monedas_otorgadas,
      monedas_total: monedasResult.monedas_total
    });

  } catch (err) {
    console.error('Error reclamando recompensa:', err);
    res.status(500).json({ error: 'Error reclamando recompensa' });
  }
});

export default router;
