import express from 'express';
import { supabase } from '../config/db.js';
import { enviarCodigo } from '../utils/judge0.js';
import { otorgarXP, registrarActividadDiaria, otorgarXPUnaVezPorDia } from '../services/gamificacion.js';
import { obtenerDificultadEjercicio, xpPorDificultad } from '../services/ejercicio.js';
import { checkAndGrantLogros } from "../services/logros.js";

const router = express.Router();

router.post('/', async (req, res) => {
    //debug + validacion temprana
    console.log("[submit-final] body recibido:", JSON.stringify(req.body));

    let { id_cliente, id_ejercicio, codigo_fuente, lenguaje } = req.body;

    //normalizar id_cliente a nro
    const idClienteNum = Number(id_cliente);

    //validaciones previas
    if (!Number.isInteger(idClienteNum) || !id_ejercicio || !codigo_fuente || !lenguaje) {
        console.warn("[submit-final] faltan/invalidos:", { id_cliente, id_ejercicio, lenguaje });
        return res.status(400).json({ error: 'Faltan datos obligatorios o id_cliente inválido' });
    }

    //validar que el cliente exista 
    const { data: clienteRow, error: clienteErr } = await supabase
        .from('cliente')
        .select('id_cliente, id_usuario')
        .eq('id_cliente', idClienteNum)
        .maybeSingle();

    if (clienteErr) {
        console.error('[submit-final] error verificando cliente:', clienteErr);
        return res.status(500).json({ error: 'Error verificando cliente' });
    }
    if (!clienteRow) {
        console.warn('[submit-final] intento con id_cliente inexistente (tabla cliente):', idClienteNum);
        return res.status(400).json({
        error: 'id_cliente inválido o cliente no encontrado. Volvé a iniciar sesión.',
        code: 'CLIENT_NOT_FOUND',
        id_cliente_received: idClienteNum
        });
    }

    try {
        // cargar casos de prueba
        const { data: casos, error: errorCasos } = await supabase
        .from('caso_prueba')
        .select('id_caso, entrada_procesada, salida_esperada')
        .eq('id_ejercicio', id_ejercicio);

        if (errorCasos) throw errorCasos;

        const resultados = [];
        let tiempoMax = 0;
        let memoriaMax = 0;

        for (const caso of casos) {
        const entradaProcesada = caso.entrada_procesada?.[lenguaje];
        const plantilla = codigo_fuente.replace('{entrada}', entradaProcesada);
        const resultado = await enviarCodigo(plantilla, lenguaje);

        const tiempoCaso = parseFloat(resultado.time || 0);
        tiempoMax = Math.max(tiempoMax, tiempoCaso);
        memoriaMax = Math.max(memoriaMax, resultado.memory || 0);

        const salida_obtenida = resultado.stdout?.trim() ?? 'error';
        const aceptado = salida_obtenida === caso.salida_esperada;

        resultados.push({
            id_caso: caso.id_caso,
            entrada: caso.entrada_procesada,
            salida_esperada: caso.salida_esperada,
            salida_obtenida,
            resultado: aceptado ? 'aceptado' : 'rechazado',
            tiempo: resultado.time ?? null,
            memoria: resultado.memory ?? null
        });
        }

        const aceptado = resultados.every(r => r.resultado === 'aceptado');

        //insertar submit_final con idClienteNum 
        const { data: inserted, error: errorInsert } = await supabase
        .from('submit_final')
        .insert([{
            id_cliente: idClienteNum,
            id_ejercicio,
            codigo_fuente,
            lenguaje,
            resultado: aceptado,
            tiempo_ejecucion: tiempoMax,
            memoria_usada: memoriaMax,
            detalles: resultados
        }])
        .select()
        .single();

        if (errorInsert) throw errorInsert;

        let recompensa = null;
        let recompensa_bonus = null;

        if (aceptado) {
        const lang = (lenguaje || "").trim().toLowerCase();

        const { data: row, error: selErr } = await supabase
            .from('usuario_ejercicio_resuelto')
            .select('lenguajes_resueltos')
            .eq('id_cliente', idClienteNum)
            .eq('id_ejercicio', id_ejercicio)
            .maybeSingle();

        if (selErr) throw selErr;

        if (!row) {
            const difNum = await obtenerDificultadEjercicio(id_ejercicio);
            const cantidad = xpPorDificultad(difNum);

            recompensa = await otorgarXP({
            id_cliente: idClienteNum,
            cantidad,
            motivo: { tipo: 'submit', detalle: { id_ejercicio, dificultad: difNum, lenguaje: lang } }
            });

            await registrarActividadDiaria({
            id_cliente: idClienteNum,
            tipo: "resolver_ejercicio",
            xpDelta: cantidad,
            incrementar: true
            });

            const { error: insErr } = await supabase
            .from('usuario_ejercicio_resuelto')
            .insert({
                id_cliente: idClienteNum,
                id_ejercicio,
                id_submit_final: inserted.id_submit_final,
                lenguajes_resueltos: [lang]
            });
            if (insErr) throw insErr;

        } else {
            const yaTiene = Array.isArray(row.lenguajes_resueltos)
            ? row.lenguajes_resueltos.map(s => (s || '').toLowerCase())
            : [];
            if (!yaTiene.includes(lang)) {
            const nuevo = [...yaTiene, lang];

            const { error: upErr } = await supabase
                .from('usuario_ejercicio_resuelto')
                .update({ lenguajes_resueltos: nuevo })
                .eq('id_cliente', idClienteNum)
                .eq('id_ejercicio', id_ejercicio);

            if (upErr) throw upErr;
            }
        }

        recompensa_bonus = await otorgarXPUnaVezPorDia({
            id_cliente: idClienteNum,
            tipoActividad: "primer_resuelto_dia",
            xp: 5,
            motivo: { tipo: "bonus_primer_resuelto_dia" }
        });

        if (recompensa_bonus?.otorgado) {
            await registrarActividadDiaria({
            id_cliente: idClienteNum,
            tipo: "resolver_ejercicio",
            xpDelta: 5,
            incrementar: false
            });
        }
        }

        // recompensa para el front
        const xpBase = Number((recompensa?.xp_otorgado ?? recompensa?.xp ?? recompensa?.cantidad ?? 0));
        const xpBonus = Number((recompensa_bonus?.otorgado ? (recompensa_bonus?.xp ?? recompensa_bonus?.xp_otorgado ?? 0) : 0));
        const reward = (aceptado && (xpBase + xpBonus) > 0)
        ? { amount: xpBase + xpBonus, icon: "💎" }
        : null;

        // Verificar y otorgar logros
        let nuevosLogros = [];
        try {
        nuevosLogros = await checkAndGrantLogros(idClienteNum);
        } catch (e) {
        console.warn("checkAndGrantLogros fallo tras submit-final:", e);
        nuevosLogros = [];
        }

        res.json({
        mensaje: 'Submit Final procesado con Judge0',
        resultado: aceptado ? 'aceptado' : 'rechazado',
        tiempo_max: tiempoMax,
        memoria_max: memoriaMax,
        detalles: resultados,
        insert: inserted,
        recompensa,
        recompensa_bonus,
        reward,
        nuevosLogros
        });

    } catch (err) {
        console.error('Error en submit-final:', err);
        res.status(500).json({ error: 'Error procesando submit-final' });
    }
    });

    router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
        .from('submit_final')
        .select('*')
        .eq('id_submit_final', id)
        .single();

        if (error) {
        if (error.code === 'PGRST116') return res.status(404).json({ error: 'No encontrado' });
        throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('Error GET submit-final/:id', err);
        res.status(500).json({ error: 'Error obteniendo submit-final' });
    }
    });

    router.get('/comparacion/:id_ejercicio', async (req, res) => {
    const { id_ejercicio } = req.params;

    try {
        const { data, error } = await supabase
        .from('submit_final')
        .select('detalles, memoria_usada')
        .eq('id_ejercicio', id_ejercicio);

        if (error) throw error;
        if (!data || data.length === 0)
        return res.json({ mejorTiempo: 0, promedioTiempo: 0, mejorMemoria: 0, promedioMemoria: 0 });

        const tiempos = data
        .map(r => {
            if (!Array.isArray(r.detalles)) return null;
            const maxCaso = r.detalles.reduce((max, c) =>
            parseFloat(c.tiempo || 0) > parseFloat(max.tiempo || 0) ? c : max,
            { tiempo: 0 }
            );
            return parseFloat(maxCaso.tiempo || 0);
        })
        .filter(t => t > 0);

        const memorias = data.map(r => r.memoria_usada).filter(m => m && m > 0);

        if (tiempos.length === 0)
        return res.json({ mejorTiempo: 0, promedioTiempo: 0, mejorMemoria: 0, promedioMemoria: 0 });

        const mejorTiempo = Math.min(...tiempos);
        const promedioTiempo = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;

        const mejorMemoria = Math.min(...memorias);
        const promedioMemoria = memorias.reduce((a, b) => a + b, 0) / memorias.length;

        res.json({
        mejorTiempo: parseFloat(mejorTiempo.toFixed(3)),
        promedioTiempo: parseFloat(promedioTiempo.toFixed(3)),
        mejorMemoria,
        promedioMemoria: Math.round(promedioMemoria)
        });
    } catch (err) {
        console.error('Error GET /submit-final/comparacion/:id_ejercicio', err);
        res.status(500).json({ error: 'Error obteniendo comparación global' });
    }
});

export default router;
