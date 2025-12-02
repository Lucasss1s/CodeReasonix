import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../../components/Navbar.jsx";
import API_BASE from "../../config/api";
import { toast } from "sonner";
import { supabase } from "../../config/supabase";
import "./adminDesafios.css";

const DIF_OPTS = [
  { value: "", label: "Todas" },
  { value: "facil", label: "Fácil" },
  { value: "intermedio", label: "Intermedio" },
  { value: "dificil", label: "Difícil" },
  { value: "experto", label: "Experto" },
];

const LENG_OPTS = [
  { value: "", label: "Todos" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "php", label: "PHP" },
];

const ESTADO_OPTS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
  { value: "finalizando", label: "Finalizando" },
  { value: "finalizado", label: "Finalizado" },
];

const SUPABASE_DESAFIOS_BUCKET = "boss-foto";

const emptyDesafioForm = {
  id_desafio: null,
  nombre: "",
  descripcion: "",
  imagen_url: "",
  fecha_inicio: "",
  fecha_fin: "",
  estado: "activo",
  hp_total: 100,
  hp_restante: "",
  recompensa_xp: 100,
  recompensa_moneda: 50,
  dificultad: "",
  lenguaje: "",
};

const emptyPreguntaForm = {
  id_pregunta: null,
  texto: "",
  A: "",
  B: "",
  C: "",
  D: "",
  correcta: "A",
  dificultad: "",
  lenguaje: "",
};

export default function AdminDesafios() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("desafios");

  const [desafios, setDesafios] = useState([]);
  const [loadingDesafios, setLoadingDesafios] = useState(true);
  const [desafioForm, setDesafioForm] = useState(emptyDesafioForm);
  const [savingDesafio, setSavingDesafio] = useState(false);

  const [imagenFile, setImagenFile] = useState(null);
  const [uploadingImagen, setUploadingImagen] = useState(false);

  const [preguntas, setPreguntas] = useState([]);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);
  const [preguntaForm, setPreguntaForm] = useState(emptyPreguntaForm);
  const [savingPregunta, setSavingPregunta] = useState(false);
  const [filtroDifPregunta, setFiltroDifPregunta] = useState("");
  const [filtroLengPregunta, setFiltroLengPregunta] = useState("");

  const [selectedDesafioId, setSelectedDesafioId] = useState("");
  const [asignaciones, setAsignaciones] = useState([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [candidatas, setCandidatas] = useState([]);
  const [puntosEdicion, setPuntosEdicion] = useState({});
  const [savingPuntosId, setSavingPuntosId] = useState(null);
  const [savingAsignacionId, setSavingAsignacionId] = useState(null);

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

  useEffect(() => {
    const rawFlag = localStorage.getItem("es_admin");
    const esAdmin = rawFlag === "true" || rawFlag === "1";
    if (!esAdmin) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const loadDesafios = async () => {
    try {
      setLoadingDesafios(true);
      const res = await axios.get(`${API_BASE}/desafios`, {
        params: { incluir_todos: 1 },
      });
      setDesafios(res.data || []);
    } catch (err) {
      console.error("Error cargando desafíos:", err);
      toast.error("No se pudieron cargar los desafíos.");
    } finally {
      setLoadingDesafios(false);
    }
  };

  useEffect(() => {
    loadDesafios();
  }, []);

  const handleChangeDesafio = (field, value) => {
    setDesafioForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditDesafio = (d) => {
    setDesafioForm({
      id_desafio: d.id_desafio,
      nombre: d.nombre || "",
      descripcion: d.descripcion || "",
      imagen_url: d.imagen_url || "",
      fecha_inicio: toInputDateTime(d.fecha_inicio),
      fecha_fin: toInputDateTime(d.fecha_fin),
      estado: d.estado || "activo",
      hp_total: d.hp_total ?? 100,
      hp_restante: d.hp_restante ?? "",
      recompensa_xp: d.recompensa_xp ?? 100,
      recompensa_moneda: d.recompensa_moneda ?? 50,
      dificultad: d.dificultad || "",
      lenguaje: d.lenguaje || "",
    });
    setImagenFile(null);
    setTab("desafios");
  };

  const handleResetDesafioForm = () => {
    setDesafioForm(emptyDesafioForm);
    setImagenFile(null);
  };

  const handleImagenFileChange = (e) => {
    const file = e.target.files?.[0];
    setImagenFile(file || null);
  };

  const handleUploadImagen = async () => {
    try {
      if (!imagenFile) {
        toast.error("Primero seleccioná una imagen desde tu dispositivo.");
        return;
      }

      setUploadingImagen(true);

      const ext = imagenFile.name.split(".").pop();
      const safeExt = ext ? ext.toLowerCase() : "png";
      const fileName = `desafio_${Date.now()}.${safeExt}`;
      const filePath = `desafios/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from(SUPABASE_DESAFIOS_BUCKET)
        .upload(filePath, imagenFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Error subiendo imagen a Supabase:", uploadErr);
        toast.error("No se pudo subir la imagen a Supabase.");
        return;
      }

      const { data: publicData } = supabase.storage
        .from(SUPABASE_DESAFIOS_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;
      if (!publicUrl) {
        toast.error("No se pudo obtener la URL pública de la imagen.");
        return;
      }

      setDesafioForm((prev) => ({
        ...prev,
        imagen_url: publicUrl,
      }));

      toast.success("Imagen subida correctamente y URL asignada al desafío.");
    } catch (err) {
      console.error("Error general subiendo imagen:", err);
      toast.error("Ocurrió un error al subir la imagen.");
    } finally {
      setUploadingImagen(false);
    }
  };

  const handleSubmitDesafio = async (e) => {
    e.preventDefault();
    try {
      setSavingDesafio(true);

      const payload = {
        nombre: desafioForm.nombre.trim(),
        descripcion: desafioForm.descripcion.trim() || null,
        imagen_url: desafioForm.imagen_url.trim() || null,
        fecha_inicio: fromInputDateTime(desafioForm.fecha_inicio),
        fecha_fin: fromInputDateTime(desafioForm.fecha_fin),
        estado: desafioForm.estado || "activo",
        hp_total: Number(desafioForm.hp_total),
        hp_restante:
          desafioForm.hp_restante !== "" && desafioForm.hp_restante !== null
            ? Number(desafioForm.hp_restante)
            : undefined,
        recompensa_xp: Number(desafioForm.recompensa_xp || 0),
        recompensa_moneda: Number(desafioForm.recompensa_moneda || 0),
        dificultad: desafioForm.dificultad || null,
        lenguaje: desafioForm.lenguaje || null,
      };

      if (!payload.nombre || isNaN(payload.hp_total)) {
        toast.error("Nombre y HP total son obligatorios.");
        return;
      }

      if (desafioForm.id_desafio) {
        await axios.put(
          `${API_BASE}/desafios/${desafioForm.id_desafio}`,
          payload
        );
        toast.success("Desafío actualizado correctamente.");
      } else {
        await axios.post(`${API_BASE}/desafios`, payload);
        toast.success("Desafío creado correctamente.");
      }

      await loadDesafios();
      handleResetDesafioForm();
    } catch (err) {
      console.error("Error guardando desafío:", err);
      const msg = err.response?.data?.error || "No se pudo guardar el desafío.";
      toast.error(msg);
    } finally {
      setSavingDesafio(false);
    }
  };

  const handleDeleteDesafio = async (d) => {
    if (!window.confirm(`¿Eliminar el desafío "${d.nombre}"?`)) return;
    try {
      await axios.delete(`${API_BASE}/desafios/${d.id_desafio}`);
      toast.success("Desafío eliminado.");
      await loadDesafios();
      if (selectedDesafioId === String(d.id_desafio)) {
        setSelectedDesafioId("");
        setAsignaciones([]);
        setCandidatas([]);
      }
    } catch (err) {
      console.error("Error eliminando desafío:", err);
      const msg = err.response?.data?.error || "No se pudo eliminar el desafío.";
      toast.error(msg);
    }
  };

  const loadPreguntas = async () => {
    try {
      setLoadingPreguntas(true);
      const params = {};
      if (filtroDifPregunta) params.dificultad = filtroDifPregunta;
      if (filtroLengPregunta) params.lenguaje = filtroLengPregunta;

      const res = await axios.get(`${API_BASE}/preguntas`, { params });
      setPreguntas(res.data || []);
    } catch (err) {
      console.error("Error cargando preguntas:", err);
      toast.error("No se pudieron cargar las preguntas.");
    } finally {
      setLoadingPreguntas(false);
    }
  };

  useEffect(() => {
    if (tab === "preguntas") {
      loadPreguntas();
    }
  }, [tab, filtroDifPregunta, filtroLengPregunta]);

  const handleChangePregunta = (field, value) => {
    setPreguntaForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditPregunta = (p) => {
    setPreguntaForm({
      id_pregunta: p.id_pregunta,
      texto: p.texto || "",
      A: p.opciones?.A || "",
      B: p.opciones?.B || "",
      C: p.opciones?.C || "",
      D: p.opciones?.D || "",
      correcta: p.correcta || "A",
      dificultad: p.dificultad || "",
      lenguaje: p.lenguaje || "",
    });
    setTab("preguntas");
  };

  const handleResetPreguntaForm = () => {
    setPreguntaForm(emptyPreguntaForm);
  };

  const handleSubmitPregunta = async (e) => {
    e.preventDefault();
    try {
      setSavingPregunta(true);

      const opciones = {
        A: preguntaForm.A,
        B: preguntaForm.B,
        C: preguntaForm.C,
        D: preguntaForm.D,
      };

      if (!preguntaForm.texto.trim()) {
        toast.error("El texto de la pregunta es obligatorio.");
        return;
      }
      if (!opciones.A || !opciones.B || !opciones.C || !opciones.D) {
        toast.error("Todas las opciones A, B, C y D son obligatorias.");
        return;
      }

      const payload = {
        texto: preguntaForm.texto.trim(),
        opciones,
        correcta: preguntaForm.correcta || "A",
        dificultad: preguntaForm.dificultad || null,
        lenguaje: preguntaForm.lenguaje || null,
      };

      if (preguntaForm.id_pregunta) {
        await axios.put(
          `${API_BASE}/preguntas/${preguntaForm.id_pregunta}`,
          payload
        );
        toast.success("Pregunta actualizada correctamente.");
      } else {
        await axios.post(`${API_BASE}/preguntas`, payload);
        toast.success("Pregunta creada correctamente.");
      }

      await loadPreguntas();
      handleResetPreguntaForm();
    } catch (err) {
      console.error("Error guardando pregunta:", err);
      const msg =
        err.response?.data?.error || "No se pudo guardar la pregunta.";
      toast.error(msg);
    } finally {
      setSavingPregunta(false);
    }
  };

  const handleDeletePregunta = async (p) => {
    if (!window.confirm(`¿Eliminar la pregunta "${p.texto.slice(0, 60)}..."?`))
      return;

    try {
      await axios.delete(`${API_BASE}/preguntas/${p.id_pregunta}`);
      toast.success("Pregunta eliminada.");
      await loadPreguntas();
    } catch (err) {
      console.error("Error eliminando pregunta:", err);
      const msg =
        err.response?.data?.error || "No se pudo eliminar la pregunta.";
      toast.error(msg);
    }
  };

  const selectedDesafio = desafios.find(
    (d) => String(d.id_desafio) === String(selectedDesafioId)
  );

  const loadAsignaciones = async (idDesafio) => {
    if (!idDesafio) {
      setAsignaciones([]);
      setCandidatas([]);
      return;
    }
    try {
      setLoadingAsignaciones(true);

      const res = await axios.get(`${API_BASE}/desafio-pregunta`, {
        params: { desafio: idDesafio },
      });
      const list = res.data || [];
      setAsignaciones(list);

      const map = {};
      list.forEach((dp) => {
        map[dp.id_desafio_pregunta] = dp.puntos ?? 10;
      });
      setPuntosEdicion(map);

      if (selectedDesafio) {
        const params = {};
        if (selectedDesafio.dificultad) {
          params.dificultad = selectedDesafio.dificultad;
        }
        if (selectedDesafio.lenguaje) {
          params.lenguaje = selectedDesafio.lenguaje;
        }

        const resPreg = await axios.get(`${API_BASE}/preguntas`, {
          params,
        });
        const todas = resPreg.data || [];
        const yaAsignadasIds = new Set(
          list.map((dp) => dp.id_pregunta || dp.pregunta?.id_pregunta)
        );
        const filtradas = todas.filter(
          (p) => !yaAsignadasIds.has(p.id_pregunta)
        );
        setCandidatas(filtradas);
      } else {
        setCandidatas([]);
      }
    } catch (err) {
      console.error("Error cargando asignaciones:", err);
      toast.error("No se pudieron cargar las asignaciones.");
    } finally {
      setLoadingAsignaciones(false);
    }
  };

  const handleChangeSelectedDesafio = (e) => {
    const id = e.target.value;
    setSelectedDesafioId(id);
  };

  useEffect(() => {
    if (tab === "asignaciones" && selectedDesafioId) {
      loadAsignaciones(selectedDesafioId);
    }
  }, [tab, selectedDesafioId, selectedDesafio]);

  const handleAgregarPreguntaADesafio = async (id_pregunta) => {
    if (!selectedDesafioId) {
      toast.error("Primero selecciona un desafío.");
      return;
    }
    try {
      setSavingAsignacionId(id_pregunta);
      await axios.post(`${API_BASE}/desafio-pregunta`, {
        id_desafio: Number(selectedDesafioId),
        id_pregunta,
      });
      toast.success("Pregunta asignada al desafío.");
      await loadAsignaciones(selectedDesafioId);
    } catch (err) {
      console.error("Error asignando pregunta:", err);
      const msg =
        err.response?.data?.error ||
        "No se pudo asignar la pregunta al desafío.";
      toast.error(msg);
    } finally {
      setSavingAsignacionId(null);
    }
  };

  const handleGuardarPuntos = async (id_dp) => {
    const valor = Number(puntosEdicion[id_dp]);
    if (isNaN(valor) || valor < 0) {
      toast.error("Los puntos deben ser un número mayor o igual a 0.");
      return;
    }
    try {
      setSavingPuntosId(id_dp);
      await axios.put(`${API_BASE}/desafio-pregunta/${id_dp}`, {
        puntos: valor,
      });
      toast.success("Puntos actualizados.");
      await loadAsignaciones(selectedDesafioId);
    } catch (err) {
      console.error("Error actualizando puntos:", err);
      const msg =
        err.response?.data?.error || "No se pudieron actualizar los puntos.";
      toast.error(msg);
    } finally {
      setSavingPuntosId(null);
    }
  };

  const handleEliminarAsignacion = async (id_dp) => {
    if (!window.confirm("¿Quitar esta pregunta del desafío?")) return;
    try {
      await axios.delete(`${API_BASE}/desafio-pregunta/${id_dp}`);
      toast.success("Pregunta quitada del desafío.");
      await loadAsignaciones(selectedDesafioId);
    } catch (err) {
      console.error("Error eliminando asignación:", err);
      const msg =
        err.response?.data?.error ||
        "No se pudo eliminar la asignación de la pregunta.";
      toast.error(msg);
    }
  };

  return (
    <>
      <Navbar />
      <div className="admin-page">
        <header className="admin-header admin-header-desafios">
          <div>
            <h2 className="admin-title">Panel ABM — Desafíos</h2>
            <p className="admin-subtitle">
              Crear y gestionar desafíos, preguntas y su asignación por
              lenguaje / dificultad.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/adminusuarios")}
            className="admin-back-button"
          >
            Volver a panel de usuarios
          </button>
        </header>

        <div className="admin-tabs">
          <button
            type="button"
            className={`btn-estado admin-tab-button ${
              tab === "desafios" ? "admin-tab-desafios-active" : ""
            }`}
            onClick={() => setTab("desafios")}
          >
            Desafíos
          </button>
          <button
            type="button"
            className={`btn-estado admin-tab-button ${
              tab === "preguntas" ? "admin-tab-preguntas-active" : ""
            }`}
            onClick={() => setTab("preguntas")}
          >
            Preguntas
          </button>
          <button
            type="button"
            className={`btn-estado admin-tab-button ${
              tab === "asignaciones" ? "admin-tab-asignaciones-active" : ""
            }`}
            onClick={() => setTab("asignaciones")}
          >
            Asignar preguntas
          </button>
        </div>

        {tab === "desafios" && (
          <section className="admin-card">
            <div className="admin-desafios-layout">
              <div>
                <h3 className="admin-section-title">
                  {desafioForm.id_desafio
                    ? `Editar desafío #${desafioForm.id_desafio}`
                    : "Crear nuevo desafío"}
                </h3>
                <form onSubmit={handleSubmitDesafio} className="admin-form">
                  <div className="admin-field">
                    <label className="admin-label">Nombre *</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={desafioForm.nombre}
                      onChange={(e) =>
                        handleChangeDesafio("nombre", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Descripción</label>
                    <textarea
                      className="admin-input"
                      rows={3}
                      value={desafioForm.descripcion}
                      onChange={(e) =>
                        handleChangeDesafio("descripcion", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">Imagen del desafío</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="URL de imagen (se completa automáticamente al subir)"
                      value={desafioForm.imagen_url}
                      onChange={(e) =>
                        handleChangeDesafio("imagen_url", e.target.value)
                      }
                    />
                    <small className="admin-help-text">
                      Podés pegar una URL manualmente o subir un archivo desde tu
                      dispositivo para guardarlo en Supabase Storage.
                    </small>
                    <div className="admin-upload-row">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImagenFileChange}
                      />
                      <button
                        type="button"
                        className="btn-estado"
                        onClick={handleUploadImagen}
                        disabled={!imagenFile || uploadingImagen}
                      >
                        {uploadingImagen ? "Subiendo..." : "Subir a Supabase"}
                      </button>
                    </div>
                    {desafioForm.imagen_url && (
                      <div className="admin-image-preview-wrapper">
                        <span className="admin-preview-label">
                          Vista previa:
                        </span>
                        <img
                          src={desafioForm.imagen_url}
                          alt="Imagen del desafío"
                          className="admin-image-preview"
                        />
                      </div>
                    )}
                  </div>

                  <div className="admin-grid-2">
                    <div>
                      <label className="admin-label">Fecha inicio</label>
                      <input
                        type="datetime-local"
                        className="admin-input"
                        value={desafioForm.fecha_inicio}
                        onChange={(e) =>
                          handleChangeDesafio("fecha_inicio", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="admin-label">Fecha fin</label>
                      <input
                        type="datetime-local"
                        className="admin-input"
                        value={desafioForm.fecha_fin}
                        onChange={(e) =>
                          handleChangeDesafio("fecha_fin", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="admin-grid-3">
                    <div>
                      <label className="admin-label">HP total *</label>
                      <input
                        type="number"
                        min={1}
                        className="admin-input"
                        value={desafioForm.hp_total}
                        onChange={(e) =>
                          handleChangeDesafio("hp_total", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="admin-label">HP restante</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={desafioForm.hp_restante ?? ""}
                        onChange={(e) =>
                          handleChangeDesafio("hp_restante", e.target.value)
                        }
                        placeholder="(vacío = igual a total)"
                      />
                    </div>
                    <div>
                      <label className="admin-label">Estado</label>
                      <select
                        className="admin-input"
                        value={desafioForm.estado}
                        onChange={(e) =>
                          handleChangeDesafio("estado", e.target.value)
                        }
                      >
                        {ESTADO_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="admin-grid-2">
                    <div>
                      <label className="admin-label">Recompensa XP</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={desafioForm.recompensa_xp}
                        onChange={(e) =>
                          handleChangeDesafio(
                            "recompensa_xp",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="admin-label">Recompensa monedas</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={desafioForm.recompensa_moneda}
                        onChange={(e) =>
                          handleChangeDesafio(
                            "recompensa_moneda",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="admin-grid-2-lgmargin">
                    <div>
                      <label className="admin-label">Dificultad</label>
                      <select
                        className="admin-input"
                        value={desafioForm.dificultad}
                        onChange={(e) =>
                          handleChangeDesafio("dificultad", e.target.value)
                        }
                      >
                        {DIF_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Lenguaje</label>
                      <select
                        className="admin-input"
                        value={desafioForm.lenguaje}
                        onChange={(e) =>
                          handleChangeDesafio("lenguaje", e.target.value)
                        }
                      >
                        {LENG_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="admin-actions-row">
                    <button
                      type="button"
                      className="btn-estado"
                      onClick={handleResetDesafioForm}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="btn-guardar"
                      disabled={savingDesafio}
                    >
                      {savingDesafio
                        ? "Guardando..."
                        : desafioForm.id_desafio
                        ? "Guardar cambios"
                        : "Crear desafío"}
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="admin-section-title">Lista de desafíos</h3>
                {loadingDesafios ? (
                  <div className="admin-loading">Cargando desafíos...</div>
                ) : desafios.length === 0 ? (
                  <div className="admin-empty">
                    No hay desafíos creados todavía.
                  </div>
                ) : (
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nombre</th>
                          <th>Dificultad</th>
                          <th>Lenguaje</th>
                          <th>Estado</th>
                          <th>HP</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {desafios.map((d) => (
                          <tr key={d.id_desafio}>
                            <td>{d.id_desafio}</td>
                            <td>{d.nombre}</td>
                            <td>{d.dificultad || "-"}</td>
                            <td>{d.lenguaje || "-"}</td>
                            <td>
                              <span
                                className={`estado-pill ${
                                  d.estado === "activo"
                                    ? "estado-activo"
                                    : "estado-baneado"
                                }`}
                              >
                                {d.estado}
                              </span>
                            </td>
                            <td>
                              {d.hp_restante ?? d.hp_total}/{d.hp_total}
                            </td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  className="btn-estado"
                                  onClick={() => handleEditDesafio(d)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-estado btn-bloquear"
                                  onClick={() => handleDeleteDesafio(d)}
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
            </div>
          </section>
        )}

        {tab === "preguntas" && (
          <section className="admin-card">
            <div className="admin-preguntas-layout">
              <div>
                <h3 className="admin-section-title">
                  {preguntaForm.id_pregunta
                    ? `Editar pregunta #${preguntaForm.id_pregunta}`
                    : "Crear nueva pregunta"}
                </h3>
                <form onSubmit={handleSubmitPregunta}>
                  <div className="admin-field">
                    <label className="admin-label">Texto de la pregunta *</label>
                    <textarea
                      className="admin-input"
                      rows={4}
                      value={preguntaForm.texto}
                      onChange={(e) =>
                        handleChangePregunta("texto", e.target.value)
                      }
                    />
                  </div>

                  <div className="admin-field">
                    <label className="admin-label">
                      Opciones (se guardan como JSON)
                    </label>
                    <div className="admin-options-grid">
                      {["A", "B", "C", "D"].map((key) => (
                        <div key={key} className="admin-option-row">
                          <span className="admin-option-key">{key})</span>
                          <input
                            type="text"
                            className="admin-input"
                            value={preguntaForm[key]}
                            onChange={(e) =>
                              handleChangePregunta(key, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="admin-grid-3-lg">
                    <div>
                      <label className="admin-label">Respuesta correcta</label>
                      <select
                        className="admin-input"
                        value={preguntaForm.correcta}
                        onChange={(e) =>
                          handleChangePregunta("correcta", e.target.value)
                        }
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Dificultad</label>
                      <select
                        className="admin-input"
                        value={preguntaForm.dificultad}
                        onChange={(e) =>
                          handleChangePregunta("dificultad", e.target.value)
                        }
                      >
                        {DIF_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="admin-label">Lenguaje</label>
                      <select
                        className="admin-input"
                        value={preguntaForm.lenguaje}
                        onChange={(e) =>
                          handleChangePregunta("lenguaje", e.target.value)
                        }
                      >
                        {LENG_OPTS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="admin-actions-row">
                    <button
                      type="button"
                      className="btn-estado"
                      onClick={handleResetPreguntaForm}
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="btn-guardar"
                      disabled={savingPregunta}
                    >
                      {savingPregunta
                        ? "Guardando..."
                        : preguntaForm.id_pregunta
                        ? "Guardar cambios"
                        : "Crear pregunta"}
                    </button>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="admin-section-title">Lista de preguntas</h3>

                <div className="admin-filter-row">
                  <select
                    className="admin-input admin-filter-select"
                    value={filtroDifPregunta}
                    onChange={(e) => setFiltroDifPregunta(e.target.value)}
                  >
                    {DIF_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        Dificultad: {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="admin-input admin-filter-select"
                    value={filtroLengPregunta}
                    onChange={(e) => setFiltroLengPregunta(e.target.value)}
                  >
                    {LENG_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        Lenguaje: {o.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-estado"
                    onClick={loadPreguntas}
                  >
                    Refrescar
                  </button>
                </div>

                {loadingPreguntas ? (
                  <div className="admin-loading">Cargando preguntas...</div>
                ) : preguntas.length === 0 ? (
                  <div className="admin-empty">
                    No hay preguntas para los filtros seleccionados.
                  </div>
                ) : (
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Texto</th>
                          <th>Dif.</th>
                          <th>Leng.</th>
                          <th>Correcta</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preguntas.map((p) => (
                          <tr key={p.id_pregunta}>
                            <td>{p.id_pregunta}</td>
                            <td>{p.texto}</td>
                            <td>{p.dificultad || "-"}</td>
                            <td>{p.lenguaje || "-"}</td>
                            <td>{p.correcta}</td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  type="button"
                                  className="btn-estado"
                                  onClick={() => handleEditPregunta(p)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className="btn-estado btn-bloquear"
                                  onClick={() => handleDeletePregunta(p)}
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
            </div>
          </section>
        )}

        {tab === "asignaciones" && (
          <section className="admin-card">
            <h3 className="admin-section-title">
              Asignar preguntas a desafíos
            </h3>

            <div className="admin-asignaciones-bar">
              <label className="admin-label-small">Desafío:</label>
              <select
                className="admin-input admin-desafio-select"
                value={selectedDesafioId}
                onChange={handleChangeSelectedDesafio}
              >
                <option value="">Seleccionar desafío...</option>
                {desafios.map((d) => (
                  <option key={d.id_desafio} value={d.id_desafio}>
                    #{d.id_desafio} — {d.nombre} (
                    {d.dificultad || "-"} / {d.lenguaje || "-"})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-estado"
                onClick={() => {
                  if (selectedDesafioId) loadAsignaciones(selectedDesafioId);
                }}
              >
                Refrescar asignaciones
              </button>
            </div>

            {!selectedDesafio && (
              <div className="admin-empty">
                Selecciona un desafío para ver y gestionar sus preguntas.
              </div>
            )}

            {selectedDesafio && (
              <div className="admin-asignaciones-layout">
                <div>
                  <h4 className="admin-subtitle-sm">Preguntas asignadas</h4>
                  {loadingAsignaciones ? (
                    <div className="admin-loading">
                      Cargando asignaciones...
                    </div>
                  ) : asignaciones.length === 0 ? (
                    <div className="admin-empty">
                      Este desafío todavía no tiene preguntas asignadas.
                    </div>
                  ) : (
                    <div className="admin-table-scroll-sm">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Pregunta</th>
                            <th>Puntos</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asignaciones.map((a) => (
                            <tr key={a.id_desafio_pregunta}>
                              <td>{a.id_desafio_pregunta}</td>
                              <td>{a.pregunta?.texto}</td>
                              <td>
                                <input
                                  type="number"
                                  className="admin-input admin-puntos-input"
                                  value={
                                    puntosEdicion[a.id_desafio_pregunta] ?? ""
                                  }
                                  onChange={(e) =>
                                    setPuntosEdicion((prev) => ({
                                      ...prev,
                                      [a.id_desafio_pregunta]: e.target.value,
                                    }))
                                  }
                                />
                              </td>
                              <td>
                                <div className="admin-actions">
                                  <button
                                    type="button"
                                    className="btn-guardar"
                                    disabled={
                                      savingPuntosId === a.id_desafio_pregunta
                                    }
                                    onClick={() =>
                                      handleGuardarPuntos(a.id_desafio_pregunta)
                                    }
                                  >
                                    {savingPuntosId === a.id_desafio_pregunta
                                      ? "Guardando..."
                                      : "Guardar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-estado btn-bloquear"
                                    onClick={() =>
                                      handleEliminarAsignacion(
                                        a.id_desafio_pregunta
                                      )
                                    }
                                  >
                                    Quitar
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
                  <h4 className="admin-subtitle-sm">
                    Preguntas disponibles para asignar
                  </h4>
                  <p className="admin-hint-text">
                    Se listan preguntas con la misma dificultad/lenguaje que el
                    desafío (o sin restricción si alguno es null).
                  </p>

                  {loadingAsignaciones ? (
                    <div className="admin-loading">
                      Cargando preguntas disponibles...
                    </div>
                  ) : candidatas.length === 0 ? (
                    <div className="admin-empty">
                      No hay preguntas compatibles para asignar. Revisa la
                      dificultad y el lenguaje.
                    </div>
                  ) : (
                    <div className="admin-table-scroll-sm">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Pregunta</th>
                            <th>Dif.</th>
                            <th>Leng.</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {candidatas.map((p) => (
                            <tr key={p.id_pregunta}>
                              <td>{p.id_pregunta}</td>
                              <td>{p.texto}</td>
                              <td>{p.dificultad || "-"}</td>
                              <td>{p.lenguaje || "-"}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-guardar"
                                  disabled={
                                    savingAsignacionId === p.id_pregunta
                                  }
                                  onClick={() =>
                                    handleAgregarPreguntaADesafio(p.id_pregunta)
                                  }
                                >
                                  {savingAsignacionId === p.id_pregunta
                                    ? "Agregando..."
                                    : "Agregar"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
