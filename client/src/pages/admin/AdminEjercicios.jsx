import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import API_BASE from '../../config/api';
import Navbar from '../../components/Navbar.jsx';
import { toast } from 'sonner';
import './adminEjercicios.css';

export default function AdminEjercicios() {
    const navigate = useNavigate();

    const [ejercicios, setEjercicios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [qTitulo, setQTitulo] = useState('');
    const [qDificultad, setQDificultad] = useState('');
    const [qEtiqueta, setQEtiqueta] = useState('');
    const [qEstado, setQEstado] = useState('');

    const [seleccionado, setSeleccionado] = useState(null);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [mostrandoCasos, setMostrandoCasos] = useState(false);
    const [mostrandoPistas, setMostrandoPistas] = useState(false);
    const [mostrandoBugs, setMostrandoBugs] = useState(false);

    useEffect(() => {
        const rawFlag = localStorage.getItem('es_admin');
        const esAdmin = rawFlag === 'true' || rawFlag === '1';
        if (!esAdmin) {
            window.location.href = '/';
            return;
        }
        cargarLista();
        
    },[]);

    const cargarLista = async () => {
        try {
            setCargando(true);
            const res = await axios.get(`${API_BASE}/ejercicios?admin=1`);
            setEjercicios(res.data || []);
        } catch (err) {
            console.error('Error cargando ejercicios:', err);
            toast.error('No se pudieron cargar los ejercicios');
        } finally {
            setCargando(false);
        }
    };

    const etiquetasDisponibles = useMemo(() => {
        const s = new Set();
        ejercicios.forEach((e) => (e.etiquetas || []).forEach((t) => s.add(t)));
        return [...s].sort();
    }, [ejercicios]);

    const filtered = ejercicios.filter((e) => {
        if (qTitulo && !e.titulo.toLowerCase().includes(qTitulo.toLowerCase())) return false;
        if (qDificultad && String(e.dificultad) !== String(qDificultad)) return false;
        if (qEtiqueta && !(e.etiquetas || []).includes(qEtiqueta)) return false;
        if (qEstado) {
            if (qEstado === 'activo' && e.disabled) return false;
            if (qEstado === 'deshabilitado' && !e.disabled) return false;
        }
        return true;
    });

    const handleCrear = () => {
        setSeleccionado(null);
        setMostrarForm(true);
    };

    const handleEditar = async (id) => {
        try {
            const { data } = await axios.get(`${API_BASE}/ejercicios/${id}?admin=1`);
            setSeleccionado(data);
            setMostrarForm(true);
        } catch (err) {
            console.error('Error fetch ejercicio:', err);
            toast.error('No se pudo obtener el ejercicio');
        }
    };

    const toggleHabilitar = async (ej) => {
        const nuevoEstado = !ej.disabled;
        try {
            await axios.put(`${API_BASE}/ejercicios/${ej.id_ejercicio}`, { disabled: !ej.disabled });
            toast.success(
                nuevoEstado? "Ejercicio deshabilitado": "Ejercicio habilitado"
            );
            cargarLista();
        } catch (err) {
            console.error("Error:", err);
            toast.error("No se pudo actualizar el estado");
        }
    };

    // helpers fetch casos/pistas
    async function fetchCasos(id) {
        const candidates = [
        `${API_BASE}/casos-prueba/ejercicios/${id}/casos?admin=1`,
        `${API_BASE}/ejercicios/${id}/casos?admin=1`,
        `${API_BASE}/ejercicios/${id}?admin=1`,
        ];
        for (const url of candidates) {
            try {
                const r = await axios.get(url);
                if (r.data?.casos) return r.data.casos;
                if (r.data?.casos_prueba) return r.data.casos_prueba;
                if (Array.isArray(r.data)) return r.data;
                if (r.data?.casos_prueba) return r.data.casos_prueba;
            } catch (e) {
                if (e.response && e.response.status === 404) continue;
                console.error('fetchCasos error (no 404):', e);
            }
        }
        return [];
    }

    async function fetchPistas(id) {
        const candidates = [
        `${API_BASE}/ejercicio-pistas/${id}/pistas?admin=1`,
        `${API_BASE}/ejercicios/${id}/pistas?admin=1`,
        `${API_BASE}/ejercicios/${id}?admin=1`,
        ];
        for (const url of candidates) {
            try {
                const r = await axios.get(url);
                if (r.data?.pistas) return r.data.pistas;
                if (r.data?.pistas) return r.data.pistas;
                if (Array.isArray(r.data)) return r.data;
            } catch (e) {
                if (e.response && e.response.status === 404) continue;
                console.error('fetchPistas error (no 404):', e);
            }
        }
        return [];
    }

    const verCasos = async (id) => {
        try {
            const casos = await fetchCasos(id);
            const ex = await axios
                .get(`${API_BASE}/ejercicios/${id}?admin=1`)
                .then((r) => r.data)
                .catch(() => null);
            setSeleccionado({ id_ejercicio: id, titulo: ex?.titulo || `Ej ${id}`, casos_prueba: casos });
            setMostrandoCasos(true);
        } catch (err) {
            console.error('Error al obtener casos:', err);
            toast.error('No se pudieron cargar casos');
        }
    };

    const verPistas = async (id) => {
        try {
            const pistas = await fetchPistas(id);
            const ex = await axios
                .get(`${API_BASE}/ejercicios/${id}?admin=1`)
                .then((r) => r.data)
                .catch(() => null);
            setSeleccionado({ id_ejercicio: id, titulo: ex?.titulo || `Ej ${id}`, pistas });
            setMostrandoPistas(true);
        } catch (err) {
            console.error('Error al obtener pistas:', err);
            toast.error('No se pudieron cargar pistas');
        }
    };

    const verBugs = async (id) => {
        try {
            const { data } = await axios.get(`${API_BASE}/ejercicio-bug?ejercicio=${id}`);
            setSeleccionado({ id_ejercicio: id, titulo: `Ej ${id}`, bugs: data?.bugs || [] });
            setMostrandoBugs(true);
        } catch (err) {
            console.error('Error al cargar bugs:', err);
            toast.error('No se pudieron cargar reportes');
        }
    };

    return (
        <>
        <Navbar />

        <div className="admin-page container">
            <header className="admin-header">
            <div>
                <h2 className="admin-title">Panel ABM — Ejercicios</h2>
                <p className="admin-subtitle">Crear, editar, ver casos y pistas, revisar reportes.</p>
            </div>
            <div>
                <button
                    type="button"
                    onClick={() => navigate("/admin")}
                    className="admin-back-button">
                    Volver a panel de administración
                </button>
            </div>

            <div className="filters-row">
                <input placeholder="Buscar título..." value={qTitulo} onChange={(e) => setQTitulo(e.target.value)}  className="admin-input filter-input" />

                <select value={qDificultad}  onChange={(e) => setQDificultad(e.target.value)} className="admin-input filter-input">
                <option value="">Todas las dificultades</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                </select>

                <select value={qEtiqueta} onChange={(e) => setQEtiqueta(e.target.value)} className="admin-input filter-input" >
                <option value="">Todas las etiquetas</option>
                {etiquetasDisponibles.map((t) => (
                    <option key={t} value={t}>
                    {t}
                    </option>
                ))}
                </select>

                <select value={qEstado} onChange={(e) => setQEstado(e.target.value)} className="admin-input filter-input" >
                <option value="">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="deshabilitado">Deshabilitados</option>
                </select>

                <div className="filters-actions">
                <button className="btn-ghost" onClick={() => {
                    setQTitulo('');
                    setQDificultad('');
                    setQEtiqueta('');
                    setQEstado('');
                    }}
                >
                    Limpiar
                </button>

                <button className="btn-guardar" onClick={handleCrear}> Nuevo ejercicio </button>
                </div>
            </div>
            </header>

            {cargando ? (
            <div className="admin-loading">Cargando ejercicios...</div>
            ) : (
            <section className="admin-card">
                {filtered.length === 0 ? (
                <div className="admin-empty">No hay ejercicios que coincidan con los filtros</div>
                ) : (
                <div className="table-wrap">
                    <table className="admin-table">
                    <thead>
                        <tr>
                        <th>ID</th>
                        <th>Título</th>
                        <th>Dificultad</th>
                        <th>Etiquetas</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((ej) => (
                        <tr key={ej.id_ejercicio} className={ej.disabled ? 'row-disabled' : ''}>
                            <td className="col-id">{ej.id_ejercicio}</td>
                            <td className="td-title">{ej.titulo}</td>
                            <td className="col-center">{ej.dificultad}</td>
                            <td className="col-tags">
                            {(ej.etiquetas || []).slice(0, 3).join(', ')}
                            {(ej.etiquetas || []).length > 3 ? ' ...' : ''}
                            </td>

                            <td className="col-center">
                            {ej.disabled ? (
                                <span className="estado-badge banned">Deshabilitado</span>
                            ) : (
                                <span className="estado-badge active">Activo</span>
                            )}
                            </td>

                            <td>
                            <div className="admin-actions">
                                <button className="btn-sm" onClick={() => handleEditar(ej.id_ejercicio)}>
                                Editar
                                </button>
                                <button className={ej.disabled ? "btn-sm success" : "btn-sm danger"} onClick={() => toggleHabilitar(ej)} >
                                    {ej.disabled ? "Habilitar" : "Deshabilitar"}
                                </button>
                                <button className="btn-sm" onClick={() => verCasos(ej.id_ejercicio)}>
                                Casos
                                </button>
                                <button className="btn-sm" onClick={() => verPistas(ej.id_ejercicio)}>
                                Pistas
                                </button>
                                <button className="btn-sm" onClick={() => verBugs(ej.id_ejercicio)}>
                                Reportes
                                </button>
                            </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </section>
            )}

            {mostrarForm && (
            <EjercicioForm ejercicio={seleccionado} onClose={() => { setMostrarForm(false); cargarLista(); }} />
            )}

            {mostrandoCasos && seleccionado && (
            <CasosModal ejercicio={seleccionado} onClose={() => { setMostrandoCasos(false); setSeleccionado(null); }} />
            )}

            {mostrandoPistas && seleccionado && (
            <PistasModal ejercicio={seleccionado} onClose={() => { setMostrandoPistas(false); setSeleccionado(null); }} />
            )}

            {mostrandoBugs && seleccionado && (
            <BugsModal ejercicio={seleccionado} onClose={() => { setMostrandoBugs(false); setSeleccionado(null); }} />
            )}
        </div>
        </>
    );
}

//validaciones y UX
function EjercicioForm({ ejercicio, onClose }) {
    const esEdicion = !!ejercicio?.id_ejercicio;
    const [titulo, setTitulo] = useState(ejercicio?.titulo || '');
    const [descripcion, setDescripcion] = useState(ejercicio?.descripcion || '');
    const [dificultad, setDificultad] = useState(ejercicio?.dificultad || 1);
    const defaultPlantillas = ejercicio?.plantillas
        ? ejercicio.plantillas
        : {
            python: 'print("Hola mundo")',
            javascript: 'console.log("Hola")',
            java: 'public class Main { public static void main(String[] a){ System.out.println("Hola"); } }',
        };
    const [plantillasRaw, setPlantillasRaw] = useState(JSON.stringify(defaultPlantillas, null, 2));
    const [tagsCSV, setTagsCSV] = useState((ejercicio?.etiquetas || []).join(', '));
    const [disabled, setDisabled] = useState(Boolean(ejercicio?.disabled));
    const [guardando, setGuardando] = useState(false);

    function validarAntesGuardar() {
        if (!titulo || !titulo.trim()) {
        toast.error('El título no puede quedar vacío');
        return false;
        }
        if (!descripcion || !descripcion.trim()) {
        toast.error('La descripción no puede quedar vacía');
        return false;
        }
        try {
        const p = JSON.parse(plantillasRaw);
        // chequear keys 
        if (!p.python || !p.javascript || !p.java) {
            toast.error('Plantillas deben incluir keys: python, javascript, java');
            return false;
        }
        // eslint-disable-next-line
        } catch (e) {
        toast.error('Plantillas debe ser JSON válido');
        return false;
        }
        return true;
    }

    const handleGuardar = async () => {
        if (!validarAntesGuardar()) return;
        const plantillas = JSON.parse(plantillasRaw);
        const payload = {
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            dificultad: Number(dificultad),
            plantillas,
            etiquetas: tagsCSV.split(',').map((s) => s.trim()).filter(Boolean),
            disabled: Boolean(disabled),
        };
        try {
            setGuardando(true);
            if (esEdicion) {
                await axios.put(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}`, payload);
                toast.success('Ejercicio actualizado');
            } else {
                await axios.post(`${API_BASE}/ejercicios`, payload);
                toast.success('Ejercicio creado');
            }
            onClose();
        } catch (err) {
            console.error('Error guardando ejercicio:', err);
            toast.error('No se pudo guardar el ejercicio');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="modal-overlay admin-page">
            <div className="modal-card form-card">
                <h3 className="modal-title">{esEdicion ? 'Editar ejercicio' : 'Crear ejercicio'}</h3>

                <div className="form-grid">
                <div>
                    <label className="field-label">Título</label>
                    <input className="admin-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />

                    <label className="field-label">Descripción</label>
                    <textarea className="admin-input" rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

                    <label className="field-label">Etiquetas (coma-separadas)</label>
                    <input className="admin-input" value={tagsCSV} onChange={(e) => setTagsCSV(e.target.value)} />

                    <label className="field-label">Dificultad</label>
                    <input type="number" min={1} max={5} className="admin-input" value={dificultad} onChange={(e) => setDificultad(e.target.value)} />

                    <label className="field-label">
                    <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> Deshabilitado
                    </label>
                </div>

                <div>
                    <label className="field-label">Plantillas (JSON por lenguaje)</label>
                    <textarea className="admin-input monospace" rows={18} value={plantillasRaw} onChange={(e) => setPlantillasRaw(e.target.value)} />

                    <div className="form-buttons">
                    <button className="admin-back-button" onClick={onClose}>Cancelar</button>
                    <button className="btn-guardar" onClick={handleGuardar} disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    </div>
                </div>
                </div>
            </div>
        </div>
    );
}

// Validaciones casos modal
function CasosModal({ ejercicio, onClose }) {
    const [casos, setCasos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [nuevo, setNuevo] = useState({ entrada_procesada: JSON.stringify({ python: '', javascript: '', java: '' }, null, 2), salida_esperada: '', publico: true });
    const [editId, setEditId] = useState(null);
    const [editPayload, setEditPayload] = useState(null);

    useEffect(() => {
        (async () => {
        try {
            setCargando(true);
            const res = await axios
            .get(`${API_BASE}/casos-prueba/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`)
            .catch(() => axios.get(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`).catch(() => ({ data: { casos: ejercicio.casos_prueba || [] } })));
            setCasos(res.data.casos || res.data || []);
        } catch (err) {
            console.warn('No existe endpoint /casos admin o fallo, usando casos públicos si vienen en ejercicio', err);
            setCasos(ejercicio.casos_prueba || []);
        } finally {
            setCargando(false);
        }
        })();
    }, [ejercicio]);

    const validarCaso = (p) => {
        if (!p.salida_esperada || !String(p.salida_esperada).trim()) {
        toast.error('Salida esperada no puede estar vacía');
        return false;
        }
        try {
        JSON.parse(p.entrada_procesada);
        // eslint-disable-next-line
        } catch (e) {
        toast.error('Entrada procesada debe ser JSON válido');
        return false;
        }
        return true;
    };

    const guardarCaso = async () => {
        if (!validarCaso(nuevo)) return;
        try {
        const payload = { entrada_procesada: JSON.parse(nuevo.entrada_procesada), salida_esperada: nuevo.salida_esperada, publico: nuevo.publico };
        await axios.post(`${API_BASE}/casos-prueba/ejercicios/${ejercicio.id_ejercicio}/casos`, payload).catch(() => axios.post(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/casos`, payload));
        toast.success('Caso agregado');
        const r = await axios.get(`${API_BASE}/casos-prueba/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`).catch(() => axios.get(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`));
        setCasos(r.data.casos || r.data || []);
        setNuevo({ entrada_procesada: JSON.stringify({ python: '', javascript: '', java: '' }, null, 2), salida_esperada: '', publico: true });
        } catch (err) {
        console.error('Error guardando caso:', err);
        toast.error('No se pudo guardar caso');
        }
    };

    const startEdit = (c) => {
        setEditId(c.id_caso);
        setEditPayload({ entrada_procesada: JSON.stringify(c.entrada_procesada, null, 2), salida_esperada: c.salida_esperada, publico: c.publico });
    };
    const cancelEdit = () => {
        setEditId(null);
        setEditPayload(null);
    };

    const saveEdit = async () => {
        if (!validarCaso(editPayload)) return;
        try {
            await axios.put(`${API_BASE}/casos-prueba/casos/${editId}`, { entrada_procesada: JSON.parse(editPayload.entrada_procesada), salida_esperada: editPayload.salida_esperada, publico: editPayload.publico });
            toast.success('Caso actualizado');
            const r = await axios.get(`${API_BASE}/casos-prueba/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`).catch(() => axios.get(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`));
            setCasos(r.data.casos || r.data || []);
            cancelEdit();
        } catch (err) {
            console.error('Error actualizando caso:', err);
            toast.error('No se pudo actualizar caso');
        }
    };

    const togglePublico = async (c) => {
        try {
            await axios.put(`${API_BASE}/casos-prueba/casos/${c.id_caso}`, { publico: !c.publico });
            toast.success('Caso actualizado');
            const r = await axios.get(`${API_BASE}/casos-prueba/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`).catch(() => axios.get(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/casos?admin=1`));
            setCasos(r.data.casos || r.data || []);
        } catch (err) {
            console.error('Error actualizando caso:', err);
            toast.error('No se pudo actualizar caso');
        }
    };

    return (
        <div className="modal-overlay">
        <div className="modal-card wide">
            <h3>Casos — {ejercicio.titulo}</h3>

            {cargando ? (
            <div>Cargando casos...</div>
            ) : (
            <div>
                <table className="admin-table">
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Salida esperada</th>
                    <th>Público</th>
                    <th>Entrada (por lenguaje)</th>
                    <th>Acciones</th>
                    </tr>
                </thead>

                <tbody>
                    {(casos || []).map((c) => (
                    <tr key={c.id_caso}>
                        <td>{c.id_caso}</td>
                        <td className="cell-max-240">{c.salida_esperada}</td>
                        <td>{c.publico ? 'Sí' : 'No'}</td>
                        <td className="cell-max-320 prewrap">{JSON.stringify(c.entrada_procesada)}</td>
                        <td>
                        <div className="admin-actions">
                            <button className="btn-sm" onClick={() => startEdit(c)}>Editar</button>
                            <button className="btn-sm" onClick={() => togglePublico(c)}>
                            {c.publico ? 'Hacer privado' : 'Hacer público'}
                            </button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>

                {editId && (
                <div className="edit-block">
                    <h4>Editar caso {editId}</h4>
                    <label>Entrada procesada (JSON)</label>
                    <textarea className="admin-input monospace" rows={4} value={editPayload.entrada_procesada} onChange={(e) => setEditPayload((p) => ({ ...p, entrada_procesada: e.target.value }))} />
                    <label>Salida esperada</label>
                    <input className="admin-input" value={editPayload.salida_esperada} onChange={(e) => setEditPayload((p) => ({ ...p, salida_esperada: e.target.value }))} />
                    <label>
                    <input type="checkbox" checked={editPayload.publico} onChange={(e) => setEditPayload((p) => ({ ...p, publico: e.target.checked }))} /> Público
                    </label>

                    <div className="actions-row">
                    <button className="admin-back-button" onClick={cancelEdit}>Cancelar</button>
                    <button className="btn-guardar" onClick={saveEdit}>Guardar</button>
                    </div>
                </div>
                )}

                <div className="new-case-block mt-12">
                <h4>Agregar caso</h4>
                <label>Entrada (JSON por lenguaje)</label>
                <textarea className="admin-input monospace" rows={4} value={nuevo.entrada_procesada} onChange={(e) => setNuevo((s) => ({ ...s, entrada_procesada: e.target.value }))} />
                <label>Salida esperada</label>
                <input className="admin-input" value={nuevo.salida_esperada} onChange={(e) => setNuevo((s) => ({ ...s, salida_esperada: e.target.value }))} />

                <div className="actions-row">
                    <label>
                    <input type="checkbox" checked={nuevo.publico} onChange={(e) => setNuevo((s) => ({ ...s, publico: e.target.checked }))} /> Público
                    </label>

                    <div className="actions-right">
                    <button className="admin-back-button" onClick={onClose}>Cerrar</button>
                    <button className="btn-guardar" onClick={guardarCaso}>Guardar caso</button>
                    </div>
                </div>
                </div>
            </div>
            )}
        </div>
        </div>
    );
}

function PistasModal({ ejercicio, onClose }) {
    const [pistas, setPistas] = useState([]);
    const [nuevo, setNuevo] = useState({ titulo: '', contenido: '', orden: 1 });
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        (async () => {
        setCargando(true);
        const candidates = [
            `${API_BASE}/ejercicio-pistas/${ejercicio.id_ejercicio}/pistas?admin=1`,
            `${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/pistas?admin=1`,
            `${API_BASE}/ejercicios/${ejercicio.id_ejercicio}?admin=1`,
        ];

        let loaded = [];
        for (const url of candidates) {
            try {
            const r = await axios.get(url);
            // normalizar endpoint
            if (r.data?.pistas) {
                loaded = r.data.pistas;
                break;
            }
            if (r.data?.pistas_prueba) {
                loaded = r.data.pistas_prueba;
                break;
            }
            if (Array.isArray(r.data)) {
                loaded = r.data;
                break;
            }
            if (r.data?.pistas) {
                loaded = r.data.pistas;
                break;
            }
            } catch (e) {
            if (e.response && e.response.status === 404) continue;
            console.error('fetchPistas error (no 404):', e);
            }
        }

        // ordenar por campo 'orden'
        loaded = (loaded || []).slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
        setPistas(loaded);

        // set default orden
        const nextOrden = loaded.length ? (Number(loaded[loaded.length - 1].orden || 0) + 1) : 1;
        setNuevo({ titulo: '', contenido: '', orden: nextOrden });

        setCargando(false);
        })();
    }, [ejercicio]);

    const crearPista = async () => {
        if (!nuevo.titulo || !nuevo.titulo.trim()) {
        toast.error('Título de pista requerido');
        return;
        }
        if (!nuevo.contenido || !nuevo.contenido.trim()) {
        toast.error('Contenido de pista requerido');
        return;
        }

        try {
        await axios.post(`${API_BASE}/ejercicio-pistas/${ejercicio.id_ejercicio}/pistas`, nuevo).catch(async (e) => {
            // x cambio de ruta
            if (e.response && e.response.status === 404) {
            return axios.post(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/pistas`, nuevo);
            }
            throw e;
        });

        toast.success('Pista creada');

        // refresh
        try {
            const r = await axios
            .get(`${API_BASE}/ejercicio-pistas/${ejercicio.id_ejercicio}/pistas?admin=1`)
            .catch(() => axios.get(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}/pistas?admin=1`).catch(() => axios.get(`${API_BASE}/ejercicios/${ejercicio.id_ejercicio}?admin=1`)));
            const loaded = r.data?.pistas || r.data || [];
            const sorted = (Array.isArray(loaded) ? loaded.slice() : []).sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
            setPistas(sorted);
            const nextOrden = sorted.length ? (Number(sorted[sorted.length - 1].orden || 0) + 1) : 1;
            setNuevo({ titulo: '', contenido: '', orden: nextOrden });
        } catch (errRefresh) {
            console.warn('Pista creada pero fallo refresh:', errRefresh);
            setNuevo((prev) => ({ titulo: '', contenido: '', orden: prev.orden + 1 }));
        }
        } catch (err) {
        console.error('Error creando pista:', err);
        toast.error('No se pudo crear pista');
        }
    };

    return (
        <div className="modal-overlay">
        <div className="modal-card wide">
            <h3>Pistas — {ejercicio.titulo}</h3>

            {cargando ? (
            <div>Cargando pistas...</div>
            ) : (
            <>
                <table className="admin-table">
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Orden</th>
                    <th>Título</th>
                    <th>Contenido</th>
                    </tr>
                </thead>

                <tbody>
                    {(pistas || []).map((p) => (
                    <tr key={p.id_pista}>
                        <td>{p.id_pista}</td>
                        <td>{p.orden}</td>
                        <td>{p.titulo}</td>
                        <td className="cell-max-600 prewrap">{p.contenido}</td>
                    </tr>
                    ))}
                </tbody>
                </table>

                <div className="new-case-block mt-12">
                <h4>Agregar pista</h4>
                <label>Título</label>
                <input className="admin-input" value={nuevo.titulo} onChange={(e) => setNuevo((s) => ({ ...s, titulo: e.target.value }))} />
                <label>Contenido</label>
                <textarea className="admin-input" rows={4} value={nuevo.contenido} onChange={(e) => setNuevo((s) => ({ ...s, contenido: e.target.value }))} />
                <label>Orden</label>
                <input type="number" className="admin-input" value={nuevo.orden} onChange={(e) => setNuevo((s) => ({ ...s, orden: Number(e.target.value) }))} />

                <div className="actions-row mt-10">
                    <button className="admin-back-button" onClick={onClose}>Cerrar</button>
                    <button className="btn-guardar" onClick={crearPista}>Crear pista</button>
                </div>
                </div>
            </>
            )}
        </div>
        </div>
    );
}

function BugsModal({ ejercicio, onClose }) {
    // eslint-disable-next-line
    const [bugs, setBugs] = useState(ejercicio.bugs || []);

    return (
        <div className="modal-overlay">
        <div className="modal-card wide">
            <h3>Reportes — {ejercicio.titulo}</h3>
            {bugs.length === 0 ? (
            <div className="admin-empty">No hay reportes</div>
            ) : (
            <table className="admin-table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Código</th>
                    <th>Fecha</th>
                </tr>
                </thead>
                <tbody>
                {bugs.map((b) => (
                    <tr key={b.id_bug}>
                    <td>{b.id_bug}</td>
                    <td>{b.tipo}</td>
                    <td className="cell-max-600 prewrap">{b.descripcion}</td>
                    <td><pre className="no-margin">{b.codigo_fuente}</pre></td>
                    <td>{b.fecha}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            )}

            <div className="actions-row"><button className="admin-back-button" onClick={onClose}>Cerrar</button></div>
        </div>
        </div>
    );
}


