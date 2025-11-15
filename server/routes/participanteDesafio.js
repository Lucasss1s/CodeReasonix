import express from 'express';
import { supabase } from '../config/db.js';
import { nivelDesdeXP } from '../services/gamificacion.js'; 

const router = express.Router();

// helper: número de preguntas por inscripción (si querés cada usuario reciba 1 pregunta ahora, cambia a 1)
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
      return res.status(200).json({ participante, preguntas: [] , message: 'No hay preguntas disponibles para este desafío' });
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
    if (!id_part || Number.isNaN(id_part)) {
      return res.status(400).json({ error: 'id_participante inválido' });
    }

    const { data: partRow, error: partErr } = await supabase
      .from('participante_desafio')
      .select('*, desafio(id_desafio, estado, recompensa_xp, recompensa_moneda)')
      .eq('id_participante', id_part)
      .single();

    if (partErr) {
      console.error('Error leyendo participante:', partErr);
      return res.status(404).json({ error: 'Participante no encontrado' });
    }
    if (!partRow) return res.status(404).json({ error: 'Participante no encontrado' });

    const desafio = partRow.desafio;
    if (!desafio) return res.status(400).json({ error: 'Desafío asociado no encontrado' });

    if (!['finalizado', 'finalizando'].includes(String(desafio.estado))) {
      return res.status(400).json({ error: 'El desafío aún no está finalizado. No se puede reclamar.' });
    }

    if (partRow.recibio_recompensa) {
      return res.status(400).json({ error: 'Recompensa ya reclamada para este participante' });
    }

    const id_cliente = partRow.id_cliente;
    const xpToGive = Number(desafio.recompensa_xp || 0);
    const monedaToGive = Number(desafio.recompensa_moneda || 0);

    let xpResult = { xp_otorgado: 0, xp_total: null, nivel: null };
    if (xpToGive > 0) {
      try {
        const { data: uxRow, error: selUxErr } = await supabase
          .from('usuario_xp')
          .select('xp_total')
          .eq('id_cliente', id_cliente)
          .maybeSingle();

        if (selUxErr && selUxErr.code !== 'PGRST116') {
          console.warn('Error leyendo usuario_xp (claim):', selUxErr);
        }

        const currentXp = (uxRow && uxRow.xp_total != null) ? Number(uxRow.xp_total) : 0;
        const nuevoTotal = currentXp + xpToGive;
        const nuevoNivel = nivelDesdeXP(nuevoTotal);

        const { error: upsertErr } = await supabase
          .from('usuario_xp')
          .upsert({
            id_cliente,
            xp_total: nuevoTotal,
            nivel: nuevoNivel,
            ultima_actualizacion: new Date().toISOString()
          }, { onConflict: 'id_cliente' });

        if (upsertErr) {
          console.error('Error upsert usuario_xp en claim:', upsertErr);
          return res.status(500).json({ error: 'No se pudo otorgar XP (upsert)' });
        }

        xpResult = {
          xp_otorgado: xpToGive,
          xp_total: nuevoTotal,
          nivel: nuevoNivel
        };
      } catch (e) {
        console.error('Error otorgando XP al reclamar (directo):', e);
        return res.status(500).json({ error: 'No se pudo otorgar XP' });
      }
    }

    const { data: updPart, error: updPartErr } = await supabase
      .from('participante_desafio')
      .update({ recibio_recompensa: true })
      .eq('id_participante', id_part)
      .select()
      .single();
    if (updPartErr) {
      console.error('Error marcando participante como reclamó recompensa:', updPartErr);
      return res.status(500).json({ error: 'Error marcando recompensa como reclamada' });
    }

    return res.json({
      message: 'Recompensa reclamada correctamente',
      xp: xpResult.xp_otorgado ?? 0,
      xp_total: xpResult.xp_total ?? null,
      nivel: xpResult.nivel ?? null,
      moneda: monedaToGive
    });
  } catch (err) {
    console.error('Error en /:id_participante/claim:', err);
    res.status(500).json({ error: 'Error reclamando recompensa' });
  }
});

export default router;
