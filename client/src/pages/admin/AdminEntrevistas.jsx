import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar.jsx";
import API_BASE from "../../config/api";
import { authFetch } from "../../utils/authToken.js";
import { toast } from "sonner";
import "./adminEntrevistas.css";

const emptyEmpresaForm = {
  id_empresa: null,
  nombre: "",
  descripcion: "",
  sector: "",
};

const emptyOfertaForm = {
  id_oferta: null,
  id_empresa: "",
  titulo: "",
  descripcion: "",
  ubicacion: "",
  requisitos: "",
  fecha_publicacion: "",
};

const ESTADOS_POSTULACION = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "aceptada", label: "Aceptada ✅" },
  { value: "rechazada", label: "Rechazada ❌" },
];

const toInputDateTime = (iso) => {
  if (!iso) return "";
  try {
    return iso.slice(0, 16);
  } catch {
    return "";
  }
};

const fromInputDateTime = (value) => {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
};

const formatFecha = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
};

export default function AdminEntrevistas() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("empresas");

  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresaForm, setEmpresaForm] = useState(emptyEmpresaForm);
  const [savingEmpresa, setSavingEmpresa] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState("");

  const [ofertas, setOfertas] = useState([]);
  const [loadingOfertas, setLoadingOfertas] = useState(false);
  const [ofertaForm, setOfertaForm] = useState(emptyOfertaForm);
  const [savingOferta, setSavingOferta] = useState(false);

  const [postulaciones, setPostulaciones] = useState([]);
  const [loadingPostulaciones, setLoadingPostulaciones] = useState(false);
  const [estadoEdicion, setEstadoEdicion] = useState({});
  const [savingPostulacionId, setSavingPostulacionId] = useState(null);

  useEffect(() => {
    const rawFlag = localStorage.getItem("es_admin");
    const esAdmin = rawFlag === "true" || rawFlag === "1";
    if (!esAdmin) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const loadEmpresas = async (opts = {}) => {
    try {
      setLoadingEmpresas(true);
      const params = {};
      if (opts.useSearch && empresaSearch.trim()) {
        params.q = empresaSearch.trim();
      }
      const res = await axios.get(`${API_BASE}/empresas`, { params });
      setEmpresas(res.data || []);
    } catch (err) {
      console.error("Error cargando empresas:", err);
      toast.error("No se pudieron cargar las empresas.");
    } finally {
      setLoadingEmpresas(false);
    }
  };

  useEffect(() => {
    loadEmpresas();
  }, []);

  const handleChangeEmpresa = (field, value) => {
    setEmpresaForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditEmpresa = (e) => {
    setEmpresaForm({
      id_empresa: e.id_empresa,
      nombre: e.nombre || "",
      descripcion: e.descripcion || "",
      sector: e.sector || "",
    });
  };

  const handleResetEmpresaForm = () => {
    setEmpresaForm(emptyEmpresaForm);
  };

  const handleSubmitEmpresa = async (ev) => {
    ev.preventDefault();
    if (!empresaForm.nombre.trim()) {
      toast.error("El nombre de la empresa es obligatorio.");
      return;
    }
    try {
      setSavingEmpresa(true);

      const payload = {
        nombre: empresaForm.nombre.trim(),
        descripcion: empresaForm.descripcion.trim() || null,
        sector: empresaForm.sector.trim() || null,
      };

      if (empresaForm.id_empresa) {
        await axios.put(
          `${API_BASE}/empresas/${empresaForm.id_empresa}`,
          payload
        );
        toast.success("Empresa actualizada correctamente.");
      } else {
        await axios.post(`${API_BASE}/empresas`, payload);
        toast.success("Empresa creada correctamente.");
      }

      await loadEmpresas();
      handleResetEmpresaForm();
    } catch (err) {
      console.error("Error guardando empresa:", err);
      const msg =
        err.response?.data?.error || "No se pudo guardar la empresa.";
      toast.error(msg);
    } finally {
      setSavingEmpresa(false);
    }
  };

  const handleDeleteEmpresa = async (empresa) => {
    if (
      !window.confirm(
        `¿Eliminar la empresa "${empresa.nombre}"? Esto puede afectar ofertas relacionadas.`
      )
    )
      return;
    try {
      await axios.delete(`${API_BASE}/empresas/${empresa.id_empresa}`);
      toast.success("Empresa eliminada.");
      await loadEmpresas();
    } catch (err) {
      console.error("Error eliminando empresa:", err);
      const msg =
        err.response?.data?.error || "No se pudo eliminar la empresa.";
      toast.error(msg);
    }
  };

  const loadOfertas = async () => {
    try {
      setLoadingOfertas(true);
      const res = await authFetch(`${API_BASE}/ofertas`);
      const data = await res.json(); 
      setOfertas(data);
    } catch (err) {
      console.error("Error cargando ofertas:", err);
      toast.error("No se pudieron cargar las ofertas laborales.");
    } finally {
      setLoadingOfertas(false);
    }
  };

  useEffect(() => {
    if (tab === "ofertas") {
      loadOfertas();
      if (!empresas.length) {
        loadEmpresas();
      }
    }
  }, [tab]); 

  const handleChangeOferta = (field, value) => {
    setOfertaForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditOferta = (o) => {
    setOfertaForm({
      id_oferta: o.id_oferta,
      id_empresa: o.id_empresa ?? o.empresa?.id_empresa ?? "",
      titulo: o.titulo || "",
      descripcion: o.descripcion || "",
      ubicacion: o.ubicacion || "",
      requisitos: o.requisitos || "",
      fecha_publicacion: toInputDateTime(o.fecha_publicacion),
    });
  };

  const handleResetOfertaForm = () => {
    setOfertaForm(emptyOfertaForm);
  };

  const handleSubmitOferta = async (ev) => {
    ev.preventDefault();

    const idEmp = Number(ofertaForm.id_empresa);
    if (!idEmp || !ofertaForm.titulo.trim()) {
      toast.error("Empresa y título son obligatorios.");
      return;
    }

    try {
      setSavingOferta(true);

      const payload = {
        id_empresa: idEmp,
        titulo: ofertaForm.titulo.trim(),
        descripcion: ofertaForm.descripcion.trim() || null,
        ubicacion: ofertaForm.ubicacion.trim() || null,
        requisitos: ofertaForm.requisitos.trim() || null,
        fecha_publicacion: fromInputDateTime(ofertaForm.fecha_publicacion),
      };

      if (ofertaForm.id_oferta) {
        await authFetch(`${API_BASE}/ofertas/${ofertaForm.id_oferta}`,{
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        toast.success("Oferta laboral actualizada correctamente.");
      } else {
        await authFetch(`${API_BASE}/ofertas`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success("Oferta laboral creada correctamente.");
      }

      await loadOfertas();
      handleResetOfertaForm();
    } catch (err) {
      console.error("Error guardando oferta:", err);
      const msg =
        err.response?.data?.error || "No se pudo guardar la oferta laboral.";
      toast.error(msg);
    } finally {
      setSavingOferta(false);
    }
  };

  const handleDeleteOferta = async (o) => {
    if (
      !window.confirm(
        `¿Eliminar la oferta "${o.titulo}"? Esto puede afectar postulaciones relacionadas.`
      )
    )
      return;
    try {
      await authFetch(`${API_BASE}/ofertas/${o.id_oferta}`,{
        method: 'DELETE'
      });
      toast.success("Oferta eliminada.");
      await loadOfertas();
    } catch (err) {
      console.error("Error eliminando oferta:", err);
      const msg =
        err.response?.data?.error || "No se pudo eliminar la oferta.";
      toast.error(msg);
    }
  };

  const loadPostulaciones = async () => {
    try {
      setLoadingPostulaciones(true);
      const res = await authFetch(`${API_BASE}/postulaciones`);
      const data = await res.json();
      setPostulaciones(data);
    } catch (err) {
      console.error("Error cargando postulaciones:", err);
      toast.error("No se pudieron cargar las postulaciones.");
    } finally {
      setLoadingPostulaciones(false);
    }
  };

  useEffect(() => {
    if (tab === "postulaciones") {
      loadPostulaciones();
    }
  }, [tab]);

  const handleChangeEstadoPostulacion = (id_postulacion, value) => {
    setEstadoEdicion((prev) => ({
      ...prev,
      [id_postulacion]: value,
    }));
  };

  const handleGuardarEstadoPostulacion = async (p) => {
    const nuevoEstado = estadoEdicion[p.id_postulacion] || p.estado;
    if (!nuevoEstado) return;

    try {
      setSavingPostulacionId(p.id_postulacion);
      await authFetch(`${API_BASE}/postulaciones/${p.id_postulacion}`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado: nuevoEstado,
        }),
      });
      toast.success("Estado de postulación actualizado.");
      await loadPostulaciones();
    } catch (err) {
      console.error("Error actualizando estado de postulación:", err);
      const msg =
        err.response?.data?.error ||
        "No se pudo actualizar el estado de la postulación.";
      toast.error(msg);
    } finally {
      setSavingPostulacionId(null);
    }
  };

  const handleDeletePostulacion = async (p) => {
    if (!window.confirm("¿Eliminar esta postulación?")) return;
    try {
      await authFetch(`${API_BASE}/postulaciones/${p.id_postulacion}`,{
        method: 'DELETE',
      });
      toast.success("Postulación eliminada.");
      await loadPostulaciones();
    } catch (err) {
      console.error("Error eliminando postulación:", err);
      const msg =
        err.response?.data?.error || "No se pudo eliminar la postulación.";
      toast.error(msg);
    }
  };

  return (
    <>
      <Navbar />
      <div className="admin-page">
        <header className="admin-header admin-header-desafios">
          <div>
            <h2 className="admin-title">Panel — Ofertas laborales</h2>
            <p className="admin-subtitle">
              Gestión de empresas, ofertas laborales y postulaciones de
              candidatos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="admin-back-button"
          >
            Volver al panel de administración
          </button>
        </header>

        <div className="admin-tabs">
          <button
            type="button"
            className={`btn-estado admin-tab-button ${
              tab === "empresas" ? "admin-tab-desafios-active" : ""
            }`}
            onClick={() => setTab("empresas")}
          >
            Empresas
          </button>
          <button
            type="button"
            className={`btn-estado admin-tab-button ${
              tab === "ofertas" ? "admin-tab-preguntas-active" : ""
            }`}
            onClick={() => setTab("ofertas")}
          >
            Ofertas laborales
          </button>
          <button
            type="button"
            className={`btn-estado admin-tab-button ${
              tab === "postulaciones" ? "admin-tab-asignaciones-active" : ""
            }`}
            onClick={() => setTab("postulaciones")}
          >
            Postulaciones
          </button>
        </div>

        {tab === "empresas" && (
          <section className="admin-card">
            <div className="admin-desafios-layout">
              <div>
                <h3 className="admin-section-title">Empresas registradas</h3>

                <div className="admin-filter-row">
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Buscar por nombre..."
                    value={empresaSearch}
                    onChange={(e) => setEmpresaSearch(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-estado"
                    onClick={() => loadEmpresas({ useSearch: true })}
                  >
                    Buscar
                  </button>
                  <button
                    type="button"
                    className="btn-estado"
                    onClick={() => {
                      setEmpresaSearch("");
                      loadEmpresas();
                    }}
                  >
                    Limpiar filtro
                  </button>
                </div>

                {loadingEmpresas ? (
                  <div className="admin-loading">Cargando empresas...</div>
                ) : empresas.length === 0 ? (
                  <div className="admin-empty">
                    No hay empresas registradas.
                  </div>
                ) : (
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombre</th>
                          <th>Sector</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empresas.map((e) => (
                          <tr key={e.id_empresa}>
                            <td>{e.id_empresa}</td>
                            <td>{e.nombre}</td>
                            <td>{e.sector || "-"}</td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  className="btn-estado"
                                  onClick={() => handleEditEmpresa(e)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-estado btn-bloquear"
                                  onClick={() => handleDeleteEmpresa(e)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="admin-section-title">
                  {empresaForm.id_empresa
                    ? `Editar empresa #${empresaForm.id_empresa}`
                    : "Crear / editar empresa"}
                </h3>

                <form onSubmit={handleSubmitEmpresa} className="admin-form">
                  <div className="admin-field">
                    <label className="admin-label">Nombre *</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={empresaForm.nombre}
                      onChange={(e) =>
                        handleChangeEmpresa("nombre", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Sector</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={empresaForm.sector}
                      onChange={(e) =>
                        handleChangeEmpresa("sector", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Descripción</label>
                    <textarea
                      className="admin-input"
                      rows={3}
                      value={empresaForm.descripcion}
                      onChange={(e) =>
                        handleChangeEmpresa("descripcion", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-actions-row">
                    <button
                      type="button"
                      className="btn-estado"
                      onClick={handleResetEmpresaForm}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="btn-guardar"
                      disabled={savingEmpresa}
                    >
                      {savingEmpresa
                        ? "Guardando..."
                        : empresaForm.id_empresa
                        ? "Guardar cambios"
                        : "Crear empresa"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {tab === "ofertas" && (
          <section className="admin-card">
            <div className="admin-preguntas-layout">
              <div>
                <h3 className="admin-section-title">Ofertas laborales</h3>

                {loadingOfertas ? (
                  <div className="admin-loading">Cargando ofertas...</div>
                ) : ofertas.length === 0 ? (
                  <div className="admin-empty">
                    No hay ofertas laborales cargadas.
                  </div>
                ) : (
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Título</th>
                          <th>Empresa</th>
                          <th>Ubicación</th>
                          <th>Fecha</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ofertas.map((o) => (
                          <tr key={o.id_oferta}>
                            <td>{o.id_oferta}</td>
                            <td>{o.titulo}</td>
                            <td>
                              {o.empresa?.nombre
                                ? o.empresa.nombre
                                : o.id_empresa}
                            </td>
                            <td>{o.ubicacion || "-"}</td>
                            <td>{formatFecha(o.fecha_publicacion)}</td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  className="btn-estado"
                                  onClick={() => handleEditOferta(o)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-estado btn-bloquear"
                                  onClick={() => handleDeleteOferta(o)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="admin-section-title">
                  {ofertaForm.id_oferta
                    ? `Editar oferta #${ofertaForm.id_oferta}`
                    : "Crear / editar oferta laboral"}
                </h3>

                <form onSubmit={handleSubmitOferta} className="admin-form">
                  <div className="admin-field">
                    <label className="admin-label">Empresa *</label>
                    <select
                      className="admin-input"
                      value={ofertaForm.id_empresa}
                      onChange={(e) =>
                        handleChangeOferta("id_empresa", e.target.value)
                      }
                    >
                      <option value="">Seleccionar empresa...</option>
                      {empresas.map((e) => (
                        <option key={e.id_empresa} value={e.id_empresa}>
                          #{e.id_empresa} — {e.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Título *</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={ofertaForm.titulo}
                      onChange={(e) =>
                        handleChangeOferta("titulo", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Ubicación</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={ofertaForm.ubicacion}
                      onChange={(e) =>
                        handleChangeOferta("ubicacion", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Requisitos</label>
                    <textarea
                      className="admin-input"
                      rows={3}
                      value={ofertaForm.requisitos}
                      onChange={(e) =>
                        handleChangeOferta("requisitos", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Descripción</label>
                    <textarea
                      className="admin-input"
                      rows={3}
                      value={ofertaForm.descripcion}
                      onChange={(e) =>
                        handleChangeOferta("descripcion", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">
                      Fecha publicación (opcional)
                    </label>
                    <input
                      type="datetime-local"
                      className="admin-input"
                      value={ofertaForm.fecha_publicacion}
                      onChange={(e) =>
                        handleChangeOferta(
                          "fecha_publicacion",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="admin-actions-row">
                    <button
                      type="button"
                      className="btn-estado"
                      onClick={handleResetOfertaForm}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="btn-guardar"
                      disabled={savingOferta}
                    >
                      {savingOferta
                        ? "Guardando..."
                        : ofertaForm.id_oferta
                        ? "Guardar cambios"
                        : "Crear oferta"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}

        {tab === "postulaciones" && (
          <section className="admin-card">
            <h3 className="admin-section-title">Postulaciones</h3>

            {loadingPostulaciones ? (
              <div className="admin-loading">Cargando postulaciones...</div>
            ) : postulaciones.length === 0 ? (
              <div className="admin-empty">
                No hay postulaciones registradas.
              </div>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Oferta</th>
                      <th>Cliente</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postulaciones.map((p) => {
                      const estadoActual =
                        estadoEdicion[p.id_postulacion] || p.estado;
                      return (
                        <tr key={p.id_postulacion}>
                          <td>{p.id_postulacion}</td>
                          <td>
                            {p.oferta?.titulo
                              ? p.oferta.titulo
                              : `#${p.id_oferta}`}
                          </td>
                          <td>{p.id_cliente}</td>
                          <td>{formatFecha(p.fecha)}</td>
                          <td>
                            <select
                              className="admin-input"
                              value={estadoActual}
                              onChange={(e) =>
                                handleChangeEstadoPostulacion(
                                  p.id_postulacion,
                                  e.target.value
                                )
                              }
                            >
                              {ESTADOS_POSTULACION.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button
                                type="button"
                                className="btn-guardar"
                                disabled={
                                  savingPostulacionId === p.id_postulacion
                                }
                                onClick={() =>
                                  handleGuardarEstadoPostulacion(p)
                                }
                              >
                                {savingPostulacionId === p.id_postulacion
                                  ? "Guardando..."
                                  : "Actualizar"}
                              </button>
                              <button
                                type="button"
                                className="btn-estado btn-bloquear"
                                onClick={() => handleDeletePostulacion(p)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
