import express from 'express';
import { supabase } from '../config/db.js';
import { requireSesion } from '../middlewares/requireSesion.js';
import { requireAdmin } from '../middlewares/requireAdmin.js';

const router = express.Router();

async function ensureEtiquetas(etiquetas = []) {
    if (!Array.isArray(etiquetas) || etiquetas.length === 0) return [];
    const trimmed = [...new Set(etiquetas.map(t => t.trim()).filter(Boolean))];
    if (trimmed.length === 0) return [];

    const { data: existentes, error: errEx } = await supabase
        .from('etiqueta')
        .select('id_etiqueta, nombre')
        .in('nombre', trimmed);

    if (errEx) throw errEx;

    const existentesMap = new Map((existentes || []).map(r => [r.nombre, r.id_etiqueta]));
    const toCreate = trimmed.filter(t => !existentesMap.has(t));

    let created = [];
    if (toCreate.length) {
        const { data: ins, error: errIns } = await supabase
        .from('etiqueta')
        .insert(toCreate.map(n => ({ nombre: n })))
        .select();
        if (errIns) throw errIns;
        created = ins || [];
    }

    const all = [...(existentes || []), ...created];
    return all.map(a => a.id_etiqueta);
}

async function attachEtiquetasToEjercicios(ejerciciosData = []) {
    if (!Array.isArray(ejerciciosData) || ejerciciosData.length === 0) {
        return [];
    }

    const ids = ejerciciosData.map(e => e.id_ejercicio);

    // relacion ejercicio-etiqueta
    const { data: relData, error: errorRel } = await supabase
        .from('ejercicio_etiqueta')
        .select('id_ejercicio, id_etiqueta')
        .in('id_ejercicio', ids);

    if (errorRel) throw errorRel;

    if (!relData || relData.length === 0) {
        return ejerciciosData.map(e => ({ ...e, etiquetas: [] }));
    }

    //etiqueta
    const etiquetaIds = [...new Set(relData.map(r => r.id_etiqueta))];

    const { data: etiquetasData, error: errorEt } = await supabase
        .from('etiqueta')
        .select('id_etiqueta, nombre')
        .in('id_etiqueta', etiquetaIds);

    if (errorEt) throw errorEt;

    const etiquetasById = new Map(
        (etiquetasData || []).map(e => [e.id_etiqueta, e.nombre])
    );

    const etiquetasPorEjercicio = {};
    relData.forEach(({ id_ejercicio, id_etiqueta }) => {
        const nombre = etiquetasById.get(id_etiqueta);
        if (!nombre) return;

        if (!etiquetasPorEjercicio[id_ejercicio]) {
        etiquetasPorEjercicio[id_ejercicio] = [];
        }
        etiquetasPorEjercicio[id_ejercicio].push(nombre);
    });

    return ejerciciosData.map(ej => ({
        ...ej,
        etiquetas: [...new Set(etiquetasPorEjercicio[ej.id_ejercicio] || [])]
    }));
    }

    
router.get('/', requireSesion, async (req, res) => {
    try {
        const { data: ejerciciosData, error } = await supabase
        .from('ejercicio')
        .select('id_ejercicio, titulo, descripcion, dificultad, plantillas')
        .eq('disabled', false)
        .order('id_ejercicio', { ascending: true });

        if (error) throw error;

        const ejercicios = await attachEtiquetasToEjercicios(ejerciciosData);
        res.json(ejercicios);
    } catch (err) {
        console.error('Error listando ejercicios (user):', err);
        res.status(500).json({ error: 'Error listando ejercicios' });
    }
});

router.get('/admin', requireSesion, requireAdmin, async (req, res) => {
    try {
        const { data: ejerciciosData, error } = await supabase
        .from('ejercicio')
        .select('id_ejercicio, titulo, descripcion, dificultad, disabled, plantillas')
        .order('id_ejercicio', { ascending: true });

        if (error) throw error;

        const ejercicios = await attachEtiquetasToEjercicios(ejerciciosData);
        res.json(ejercicios);
    } catch (err) {
        console.error('Error listando ejercicios (admin):', err);
        res.status(500).json({ error: 'Error listando ejercicios' });
    }
});

// Detalle ejercicio con casos de prueba
router.get('/:id', requireSesion, async (req, res) => {
    const { id } = req.params;

    try {
        const { data: ejercicio, error } = await supabase
        .from('ejercicio')
        .select('id_ejercicio, titulo, descripcion, dificultad, plantillas')
        .eq('id_ejercicio', id)
        .eq('disabled', false)
        .maybeSingle();

        if (error) throw error;
        if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

        const [ejConEtiquetas] = await attachEtiquetasToEjercicios([ejercicio]);

        const { data: casos } = await supabase
        .from('caso_prueba')
        .select('id_caso, entrada_procesada, salida_esperada')
        .eq('id_ejercicio', id)
        .eq('publico', true);

        const { data: pistas } = await supabase
        .from('ejercicio_pista')
        .select('id_pista, titulo, contenido, orden')
        .eq('id_ejercicio', id)
        .order('orden');

        res.json({
        ...ejConEtiquetas,
        casos_prueba: casos || [],
        pistas: pistas || []
        });
    } catch (err) {
        console.error('Error obteniendo ejercicio (user):', err);
        res.status(500).json({ error: 'Error obteniendo ejercicio' });
    }
});

router.get('/admin/:id', requireSesion, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const { data: ejercicio, error } = await supabase
        .from('ejercicio')
        .select('id_ejercicio, titulo, descripcion, dificultad, plantillas, disabled')
        .eq('id_ejercicio', id)
        .maybeSingle();

        if (error) throw error;
        if (!ejercicio) return res.status(404).json({ error: 'Ejercicio no encontrado' });

        const [ejConEtiquetas] = await attachEtiquetasToEjercicios([ejercicio]);

        const { data: casos } = await supabase
        .from('caso_prueba')
        .select('id_caso, entrada_procesada, salida_esperada, publico')
        .eq('id_ejercicio', id);

        const { data: pistas } = await supabase
        .from('ejercicio_pista')
        .select('id_pista, titulo, contenido, orden')
        .eq('id_ejercicio', id)
        .order('orden');

        res.json({
        ...ejConEtiquetas,
        casos_prueba: casos || [],
        pistas: pistas || []
        });
    } catch (err) {
        console.error('Error obteniendo ejercicio (admin):', err);
        res.status(500).json({ error: 'Error obteniendo ejercicio' });
    }
});



router.post('/', requireSesion, requireAdmin, async (req, res) => {
    const { titulo, descripcion, dificultad = 1, plantillas = {}, etiquetas = [], disabled = false } = req.body || {};
    if (!titulo || !descripcion) return res.status(400).json({ error: 'titulo y descripcion son obligatorios' });

    try {
        const { data: inserted, error: errorInsert } = await supabase
        .from('ejercicio')
        .insert([{ titulo, descripcion, dificultad, plantillas, disabled }])
        .select()
        .single();
        if (errorInsert) throw errorInsert;

        const etiquetaIds = await ensureEtiquetas(etiquetas);
        if (etiquetaIds.length) {
        const rels = etiquetaIds.map(id_etiqueta => ({ id_ejercicio: inserted.id_ejercicio, id_etiqueta }));
        const { error: relErr } = await supabase.from('ejercicio_etiqueta').insert(rels);
        if (relErr) console.warn('No se pudieron crear relaciones etiquetas:', relErr);
        }

        res.json({ ok: true, ejercicio: inserted });
    } catch (err) {
        console.error('Error creando ejercicio:', err);
        res.status(500).json({ error: 'Error creando ejercicio' });
    }
});


router.put('/:id', requireSesion, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { titulo, descripcion, dificultad, plantillas, etiquetas, disabled } = req.body || {};

    try {
        const updates = {};
        if (titulo !== undefined) updates.titulo = titulo;
        if (descripcion !== undefined) updates.descripcion = descripcion;
        if (dificultad !== undefined) updates.dificultad = dificultad;
        if (plantillas !== undefined) updates.plantillas = plantillas;
        if (disabled !== undefined) updates.disabled = disabled;

        const { data: updated, error: errUp } = await supabase
        .from('ejercicio')
        .update(updates)
        .eq('id_ejercicio', id)
        .select()
        .maybeSingle();
        if (errUp) throw errUp;
        if (!updated) return res.status(404).json({ error: 'Ejercicio no encontrado' });

        if (Array.isArray(etiquetas)) {
        const { error: delRelErr } = await supabase.from('ejercicio_etiqueta').delete().eq('id_ejercicio', id);
        if (delRelErr) console.warn('No se pudieron borrar relaciones (continuando):', delRelErr);
        const etiquetaIds = await ensureEtiquetas(etiquetas);
        if (etiquetaIds.length) {
            const rels = etiquetaIds.map(id_etiqueta => ({ id_ejercicio: Number(id), id_etiqueta }));
            const { error: insRelErr } = await supabase.from('ejercicio_etiqueta').insert(rels);
            if (insRelErr) console.warn('No se pudieron insertar relaciones etiquetas:', insRelErr);
        }
        }

        res.json({ ok: true, ejercicio: updated });
    } catch (err) {
        console.error('Error actualizando ejercicio:', err);
        res.status(500).json({ error: 'Error actualizando ejercicio' });
    }
});

export default router;
