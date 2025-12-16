import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE from "../../config/api";
import Navbar from "../../components/Navbar.jsx";
import { toast } from "sonner";
import "./adminLogros.css";

export default function AdminLogros() {
    const navigate = useNavigate();

    const [logros, setLogros] = useState([]);
    const [condiciones, setCondiciones] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const [titulo, setTitulo] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [tipo, setTipo] = useState("");
    const [valor, setValor] = useState("");
    const [xp, setXp] = useState("");
    const [icono, setIcono] = useState("");

    useEffect(() => {
        const esAdmin =
        localStorage.getItem("es_admin") === "true" ||
        localStorage.getItem("es_admin") === "1";

        if (!esAdmin) {
        navigate("/");
        return;
        }

        cargarTodo();
    }, []);

    const cargarTodo = async () => {
        try {
        setCargando(true);

        const [logrosRes, condRes] = await Promise.all([
            axios.get(`${API_BASE}/logros`),
            axios.get(`${API_BASE}/logros/condiciones-soportadas`)
        ]);

        setLogros(logrosRes.data || []);
        setCondiciones(condRes.data || []);
        } catch {
            toast.error("Error cargando datos");
        } finally {
            setCargando(false);
        }
    };

    const abrirCrear = () => {
        setEditando(null);
        setTitulo("");
        setDescripcion("");
        setTipo("");
        setValor("");
        setXp("");
        setIcono("");
        setMostrarForm(true);
    };

    const abrirEditar = (logro) => {
        setEditando(logro);
        setTitulo(logro.titulo);
        setDescripcion(logro.descripcion);
        setXp(logro.xp_otorgado);
        setIcono(logro.icono || "");

        const tipoCond = logro.condicion.tipo;
        const def = condiciones.find((c) => c.tipo === tipoCond);
        const paramKey = def?.params[0]?.key;

        setTipo(tipoCond);
        setValor(
        paramKey && logro.condicion[paramKey] !== undefined
            ? String(logro.condicion[paramKey])
            : ""
        );

        setMostrarForm(true);
    };

    const guardar = async (e) => {
        e.preventDefault();

        if (!titulo || !tipo || !valor || !xp) {
            toast.error("Completa todos los campos obligatorios");
            return;
        }

        const def = condiciones.find((c) => c.tipo === tipo);
        const paramKey = def.params[0].key;

        const payload = { titulo, descripcion,  xp_otorgado: Number(xp), icono,
            condicion: {tipo,  [paramKey]: Number(valor)}
        };

        try {
            setGuardando(true);

            if (editando) {
                await axios.put(`${API_BASE}/logros/${editando.id_logro}`, payload);
                toast.success("Logro actualizado");
            } else {
                await axios.post(`${API_BASE}/logros`, payload);
                toast.success("Logro creado");
            }

            setMostrarForm(false);
            cargarTodo();
        } catch {
            toast.error("No se pudo guardar el logro");
        } finally {
            setGuardando(false);
        }
    };

    const toggleActivo = async (logro) => {
        try {
            await axios.patch(`${API_BASE}/logros/${logro.id_logro}/activo`, { activo: !logro.activo });
            cargarTodo();
        } catch {
            toast.error("No se pudo cambiar el estado");
        }
    };

    const condicionActual = condiciones.find((c) => c.tipo === tipo);
    const paramLabel =
        condicionActual?.params[0]?.key === "cantidad"
        ? "Cantidad"
        : condicionActual?.params[0]?.key === "dias"
        ? "Días"
        : condicionActual?.params[0]?.key === "veces"
        ? "Veces"
        : condicionActual?.params[0]?.key === "valor"
        ? "Valor"
        : "";

    return (
        <>
        <Navbar />

        <div className="admin-page">
            <header className="admin-header">
            <div>
                <h2 className="admin-title">Panel ABM — Logros</h2>
                <p className="admin-subtitle">
                Gestión de logros y condiciones del sistema
                </p>
            </div>

            <div className="header-actions">
                <button className="admin-back-button" onClick={() => navigate("/admin")}>
                    Volver
                </button>
                <button className="btn-guardar" onClick={abrirCrear}>
                    Nuevo logro
                </button>
            </div>
            </header>

            {cargando ? (
            <div className="admin-loading">Cargando...</div>
            ) : (
            <section className="admin-card">
                <table className="admin-table">
                <thead>
                    <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Condición</th>
                    <th>XP</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {logros.map((l) => {
                    const def = condiciones.find((c) => c.tipo === l.condicion.tipo);
                    const param = def?.params[0]?.key;

                    return (
                        <tr key={l.id_logro}>
                        <td>{l.id_logro}</td>
                        <td>{l.titulo}</td>
                        <td>
                            {def ? (
                            `${def.label} ≥ ${l.condicion[param]}`
                            ) : (
                            <span className="admin-error-text">
                                Condición no soportada ({l.condicion.tipo})
                            </span>
                            )}
                        </td>
                        <td>{l.xp_otorgado}</td>
                        <td>{l.activo ? "Activo" : "Inactivo"}</td>
                        <td>
                            <div className="admin-actions">
                            <button className="btn-sm" onClick={() => abrirEditar(l)}>
                                Editar
                            </button>
                            <button  className={l.activo ? "btn-desactivar" : "btn-activar"} onClick={() => toggleActivo(l)}>
                                {l.activo ? "Desactivar" : "Activar"}
                            </button>
                            </div>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
                </table>
            </section>
            )}

            {mostrarForm && (
            <div className="modal-overlay">
                <div className="modal-card">
                <header className="modal-header">
                    <h3>{editando ? "Editar logro" : "Nuevo logro"}</h3>
                    <button className="modal-close" onClick={() => setMostrarForm(false)}>
                        ✕
                    </button>
                </header>

                <form className="modal-body" onSubmit={guardar}>
                    <div className="form-group">
                    <label>Título</label>
                    <input className="admin-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                    </div>

                    <div className="form-group">
                    <label>Descripción</label>
                    <textarea className="admin-input" rows={3} value={descripcion}  onChange={(e) => setDescripcion(e.target.value)} />
                    </div>

                    <div className="form-row">
                    <div className="form-group">
                        <label>Condición</label>
                        <select className="admin-input" value={tipo}
                        onChange={(e) => {
                            setTipo(e.target.value);
                            setValor("");
                        }}
                        >
                        <option value="">Seleccionar</option>
                        {condiciones.map((c) => (
                            <option key={c.tipo} value={c.tipo}>
                            {c.label}
                            </option>
                        ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>{paramLabel}</label>
                        <input type="number" className="admin-input" value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        disabled={!tipo}
                        />
                    </div>
                    </div>

                    <div className="form-row">
                    <div className="form-group">
                        <label>XP otorgada</label>
                        <input type="number" className="admin-input" value={xp} onChange={(e) => setXp(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label>Ícono</label>
                        <input className="admin-input" value={icono} onChange={(e) => setIcono(e.target.value)} />
                    </div>
                    </div>

                    <div className="modal-footer">
                    <button type="button" className="btn-estado" onClick={() => setMostrarForm(false)}>
                        Cancelar
                    </button>
                    <button className="btn-guardar" disabled={guardando}>
                        Guardar
                    </button>
                    </div>
                </form>
                </div>
            </div>
            )}
        </div>
        </>
    );
}
