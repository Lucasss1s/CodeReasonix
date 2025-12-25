import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useRequirePreferencias from "../hooks/useRequirePreferencias";
import API_BASE from "../config/api";
import { authFetch } from "../utils/authToken";
import Navbar from "../components/Navbar";
import "../index.css";

const DIFICULTAD_LABELS = ["Fácil", "Intermedio", "Difícil", "Experto"];

const LANG_ORDER = ["python", "javascript", "java"];
const LANG_LABELS = {
  python: "Python",
  javascript: "JavaScript",
  java: "Java",
};

function formatEtiqueta(nombre) {
  return nombre || "";
}

export default function Index() {
  const navigate = useNavigate();
  const [ejercicios, setEjercicios] = useState([]);
  const [recomendados, setRecomendados] = useState([]);
  const [retomar, setRetomar] = useState([]);
  const [idsResueltos, setIdsResueltos] = useState([]);

  const [todasEtiquetas, setTodasEtiquetas] = useState([]);

  const [filtroDificultad, setFiltroDificultad] = useState("todas");
  const [ocultarResueltos, setOcultarResueltos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("todos");
  const [ejercicioEtiquetasAbierto, setEjercicioEtiquetasAbierto] = useState(null);

  const [lenguajePreferido, setLenguajePreferido] = useState(null);
  const [loading, setLoading] = useState(true);

  const {clienteId, usuario, preferencias, cargandoSesion, cargandoPreferencias} = useRequirePreferencias();

  //Lenguaje pref
  useEffect(() => {
    if (preferencias?.lenguaje_pref) {
      setLenguajePreferido(preferencias.lenguaje_pref);
      return;
    }

    if (typeof window !== "undefined") {
      const prefLang = window.localStorage.getItem("crx_pref_lenguaje");
      if (prefLang) setLenguajePreferido(prefLang);
    }
  }, [preferencias]);

  useEffect(() => {
    if (!cargandoSesion && !clienteId) {
      navigate("/login", { replace: true });
    }
  }, [cargandoSesion, clienteId, navigate]);

  useEffect(() => {
    if (cargandoSesion) return;
    if (!clienteId) return; 

    const cargarDatos = async () => {
      try {
        setLoading(true);

        const resEj = await fetch(`${API_BASE}/ejercicios`);
        const ejerciciosApi = await resEj.json();
        setEjercicios(ejerciciosApi || []);

        const resRec = await authFetch(
          `${API_BASE}/recomendaciones/home/${clienteId}`
        );

        const dataRec = await resRec.json();
        setRecomendados(dataRec?.recomendados || []);
        setIdsResueltos(dataRec?.resueltosIds || []);

        const resRet = await authFetch(
          `${API_BASE}/recomendaciones/retomar/${clienteId}`
        );

        const dataRet = await resRet.json();
        setRetomar(dataRet?.retomar || []);

        const setTags = new Set();
        ejerciciosApi.forEach((ej) => {
          if (Array.isArray(ej.etiquetas)) {
            ej.etiquetas.forEach((tag) => {
              if (tag) setTags.add(tag);
            });
          }
        });
        setTodasEtiquetas(Array.from(setTags).sort((a, b) => a.localeCompare(b)));
      } catch (err) {
        console.error("Error cargando datos del home:", err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [cargandoSesion, cargandoPreferencias, clienteId]);

  if (loading || cargandoSesion || cargandoPreferencias) {
    return (
      <>
        <Navbar />
        <div className="index-container">
          <div className="home-loading-card">
            <p>Cargando tu panel...</p>
          </div>
        </div>
      </>
    );
  }

  const nombreUsuario =
    usuario?.nombre || usuario?.display_name || usuario?.email || "CodeReasoner";

  const totalEjercicios = ejercicios.length;
  const totalResueltos = idsResueltos.length;
  const percentSolved =
    totalEjercicios > 0 ? Math.round((totalResueltos / totalEjercicios) * 100) : 0;

  const busquedaLower = busqueda.trim().toLowerCase();

  //Filtros
  const ejerciciosFiltrados = ejercicios.filter((ej) => {
    const pasaDificultad =
      filtroDificultad === "todas" || ej.dificultad === Number(filtroDificultad);

    const estaResuelto = idsResueltos.includes(ej.id_ejercicio);
    const pasaResueltos = !ocultarResueltos || !estaResuelto;

    const titulo = ej.titulo || "";
    const desc = ej.descripcion || "";
    const pasaBusqueda =
      !busquedaLower ||
      titulo.toLowerCase().includes(busquedaLower) ||
      desc.toLowerCase().includes(busquedaLower);

    const etiquetasEj = Array.isArray(ej.etiquetas) ? ej.etiquetas : [];
    const pasaEtiqueta =
      filtroEtiqueta === "todos" || etiquetasEj.includes(filtroEtiqueta);

    return pasaDificultad && pasaResueltos && pasaBusqueda && pasaEtiqueta;
  });

  //Cat lenguaje
  const renderLangPills = (plantillas, highlightLang) => {
    if (!plantillas) return null;
    return (
      <div className="lang-pill-row">
        {LANG_ORDER.map((lang) => {
          if (!plantillas[lang]) return null;
          const isActive = highlightLang && highlightLang === lang;
          return (
            <span
              key={lang}
              className={"lang-pill lang-" + lang + (isActive ? " lang-pill-active" : "")}
            >
              {LANG_LABELS[lang]}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Navbar />

      <div className="index-container">
        {/* Header */}
        <header className="home-header">
          <div className="home-header-left">
            <p className="home-kicker">Panel de práctica</p>
            <h1 className="titulo">Hola, {nombreUsuario} 👋</h1>
            <p className="home-subtitle">
              Entrá directo a tus recomendados, retoma desafíos pendientes y explorá todo el catálogo.
            </p>
          </div>
        </header>

        {/* Card de progreso */}
        <section className="home-progress-wrapper">
          <div className="home-progress-card">
            <div className="home-progress-header-row">
              <div>
                <span className="home-progress-label">Progreso total</span>
                <span className="home-progress-value">
                  {totalResueltos}/{totalEjercicios}
                </span>
              </div>
            </div>

            <div className="home-progress-bar">
              <div className="home-progress-fill" style={{ width: `${percentSolved}%` }} />
            </div>
          </div>
        </section>

        {/* Recomendados */}
        {recomendados.length > 0 && (
          <section className="recomendados-section">
            <div className="section-header">
              <div>
                <h2 className="subtitulo">Recomendado para vos</h2>
                <p className="section-subtitle">Basado en tu actividad reciente y tu nivel.</p>
              </div>
            </div>

            <ul className="ejercicio-lista ejercicio-lista--cards">
              {recomendados.map((ej) => (
                <li key={ej.id_ejercicio} className="ejercicio-card recomendado-card">
                  <div className="ej-card-header ej-card-header--right">
                    <span className={`badge-dificultad dif-${ej.dificultad ?? 1}`}>
                      {DIFICULTAD_LABELS[ej.dificultad - 1] || "N/A"}
                    </span>
                  </div>
                  <h3 className="tituloeje">{ej.titulo}</h3>
                  <p className="ej-descripcion">
                    {ej.descripcion?.slice(0, 130) || "Ejercicio de práctica"}
                    {ej.descripcion && ej.descripcion.length > 130 ? "..." : ""}
                  </p>

                  {renderLangPills(ej.plantillas, lenguajePreferido)}

                  <Link to={`/ejercicio/${ej.id_ejercicio}`} className="boton-ver">
                    Resolver ahora
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Retomar */}
        {retomar.length > 0 && (
          <section className="retomar-section">
            <div className="section-header">
              <div>
                <h2 className="subtitulo">Retomá donde dejaste</h2>
                <p className="section-subtitle">
                  Desafíos que abriste y aún tienen casos por aceptar.
                </p>
              </div>
            </div>

            <ul className="retomar-list">
              {retomar.map((ej) => (
                <li key={ej.id_ejercicio} className="retomar-item retomar-card">
                  <div className="retomar-main">
                    <div className="retomar-title-row">
                      <h3 className="retomar-title">{ej.titulo}</h3>
                      <span className={`badge-dificultad dif-${ej.dificultad ?? 1}`}>
                        {DIFICULTAD_LABELS[ej.dificultad - 1] || "N/A"}
                      </span>
                    </div>

                    <p className="retomar-meta">
                      Último lenguaje: <strong>{ej.ultimo_lenguaje || "N/A"}</strong> · Intentos:{" "}
                      <strong>{ej.total_intentos ?? 1}</strong>
                    </p>

                    {renderLangPills(ej.plantillas, ej.ultimo_lenguaje)}
                  </div>

                  <Link to={`/ejercicio/${ej.id_ejercicio}`} className="retomar-link">
                    Continuar
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Lista general */}
        <section className="todos-section">
          <div className="todos-header">
            <div className="todos-header-left">
              <h2 className="subtitulo">Todos los ejercicios</h2>
              <p className="todos-subtitle">
                Filtrá por dificultad, buscá por nombre o escondé los que ya resolviste.
              </p>
            </div>

            <div className="todos-header-right">
              <input
                type="text"
                className="search-input"
                placeholder="Buscar ejercicio por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          {/* Categorias */}
          <div className="topic-and-filters">
            <div className="topic-chips">
              <button
                type="button"
                className={"topic-chip " + (filtroEtiqueta === "todos" ? "topic-chip--active" : "")}
                onClick={() => setFiltroEtiqueta("todos")}
              >
                Todos
              </button>

              {todasEtiquetas.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={"topic-chip " + (filtroEtiqueta === tag ? "topic-chip--active" : "")}
                  onClick={() => setFiltroEtiqueta(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="filtros-bar">
              <div className="filtros-left">
                <div className="filtro-item">
                  <span className="filtro-label">Dificultad</span>
                  <select
                    className="filtro-select"
                    value={filtroDificultad}
                    onChange={(e) => setFiltroDificultad(e.target.value)}
                  >
                    <option value="todas">Todas</option>
                    <option value="1">Fácil</option>
                    <option value="2">Intermedio</option>
                    <option value="3">Difícil</option>
                    <option value="4">Experto</option>
                  </select>
                </div>
              </div>

              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={ocultarResueltos}
                  onChange={(e) => setOcultarResueltos(e.target.checked)}
                />
                <span>Ocultar ejercicios resueltos</span>
              </label>
            </div>
          </div>

          <ul className="ejercicio-lista ejercicio-lista--vertical">
            {ejerciciosFiltrados.map((ej) => {
              const estaResuelto = idsResueltos.includes(ej.id_ejercicio);
              const etiquetasEj = Array.isArray(ej.etiquetas) ? ej.etiquetas : [];

              return (
                <li
                  key={ej.id_ejercicio}
                  className={
                    "ejercicio-card ejercicio-card--list " +
                    (estaResuelto ? "ej-list-completed" : "ej-list-pending")
                  }
                >
                  <div className="ej-list-main">
                    <div className="ej-list-title-row">
                      <h3 className="tituloeje">{ej.titulo}</h3>
                      <span className={`badge-dificultad dif-${ej.dificultad ?? 1}`}>
                        {DIFICULTAD_LABELS[ej.dificultad - 1] || "N/A"}
                      </span>
                    </div>
                    <p className="ej-list-descripcion">
                      {ej.descripcion?.slice(0, 140) || "Ejercicio de práctica"}
                      {ej.descripcion && ej.descripcion.length > 140 ? "..." : ""}
                    </p>

                    {/* Etiquetas  */}
                    {etiquetasEj.length > 0 && (
                      <div className="ej-list-tags">
                        {etiquetasEj.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag-pill">
                            {formatEtiqueta(tag)}
                          </span>
                        ))}

                        {etiquetasEj.length > 3 && (
                          <>
                            {ejercicioEtiquetasAbierto === ej.id_ejercicio &&
                              etiquetasEj.slice(3).map((tag) => (
                                <span key={tag} className="tag-pill tag-pill--extra">
                                  {formatEtiqueta(tag)}
                                </span>
                              ))}

                            <button
                              type="button"
                              className="tag-more-btn"
                              onClick={() =>
                                setEjercicioEtiquetasAbierto(
                                  ejercicioEtiquetasAbierto === ej.id_ejercicio
                                    ? null
                                    : ej.id_ejercicio
                                )
                              }
                            >
                              {ejercicioEtiquetasAbierto === ej.id_ejercicio
                                ? "Ver menos"
                                : `+${etiquetasEj.length - 3} más`}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ej-list-right">
                    <span
                      className={
                        "status-pill " + (estaResuelto ? "status-completed" : "status-pending")
                      }
                    >
                      {estaResuelto ? "Completado" : "Pendiente"}
                    </span>
                    <Link to={`/ejercicio/${ej.id_ejercicio}`} className="boton-ver boton-ver--small">
                      Ver ejercicio
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
