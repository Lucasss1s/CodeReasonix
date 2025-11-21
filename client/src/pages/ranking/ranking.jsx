import { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import useRequirePreferencias from "../../hooks/useRequirePreferencias";
import {
  obtenerRankingGlobal,
  obtenerRankingSemanal,
  obtenerRankingHoy,
  obtenerMiRankingGlobal,
  obtenerMiRankingSemanal,
  obtenerMiRankingHoy,
} from "../../api/ranking";
import "./ranking.css";

const TOP_MOSTRAR = 20;

const PESTANAS = [
  { key: "global", label: "Global" },
  { key: "semanal", label: "Semanal" },
  { key: "hoy", label: "Hoy" },
];

const CONFIG_PESTANA = {
  global: {
    title: "Ranking global",
    subtitle: "Compará tu progreso con toda la comunidad.",
    xpKey: "xp_total",
    solvedKey: "desafios_resueltos",
    lastKey: "ultima_actividad",
    xpLabel: "XP total",
    solvedLabel: "Resueltos",
    lastLabel: "Última actividad",
  },
  semanal: {
    title: "Ranking semanal",
    subtitle: "Competí por el mejor rendimiento de los últimos 7 días.",
    xpKey: "xp_semana",
    solvedKey: "desafios_semana",
    lastKey: "ultima_actividad_semana",
    xpLabel: "XP semana",
    solvedLabel: "Resueltos semana",
    lastLabel: "Actividad semana",
  },
  hoy: {
    title: "Ranking de hoy",
    subtitle: "Top de la jornada. Cada XP cuenta.",
    xpKey: "xp_hoy",
    solvedKey: "desafios_hoy",
    lastKey: "ultima_actividad_hoy",
    xpLabel: "XP hoy",
    solvedLabel: "Resueltos hoy",
    lastLabel: "Actividad hoy",
  },
};

function formatearFecha(ts) {
  if (!ts) return "-";
  try {
    return new Date(ts).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "-";
  }
}

function medalla(posicion) {
  if (posicion === 1) return "🥇";
  if (posicion === 2) return "🥈";
  if (posicion === 3) return "🥉";
  return null;
}

export default function RankingPage() {
  const { clienteId, cargandoSesion, cargandoPreferencias, usuario } =
    useRequirePreferencias();

  const [pestana, setPestana] = useState("global");

  const [rankingGlobal, setRankingGlobal] = useState([]);
  const [rankingSemanal, setRankingSemanal] = useState([]);
  const [rankingHoy, setRankingHoy] = useState([]);

  const [miGlobal, setMiGlobal] = useState(null);
  const [miSemanal, setMiSemanal] = useState(null);
  const [miHoy, setMiHoy] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cargandoSesion || cargandoPreferencias) return;
    if (!clienteId) return;

    const cargar = async () => {
      try {
        setCargando(true);
        setError(null);

        const [g, s, h, mg, ms, mh] = await Promise.all([
          obtenerRankingGlobal(TOP_MOSTRAR),
          obtenerRankingSemanal(TOP_MOSTRAR),
          obtenerRankingHoy(TOP_MOSTRAR),
          obtenerMiRankingGlobal(clienteId),
          obtenerMiRankingSemanal(clienteId),
          obtenerMiRankingHoy(clienteId),
        ]);

        setRankingGlobal(g?.ranking || []);
        setRankingSemanal(s?.ranking || []);
        setRankingHoy(h?.ranking || []);

        setMiGlobal(mg);
        setMiSemanal(ms);
        setMiHoy(mh);
      } catch (err) {
        console.error("Error cargando ranking:", err);
        setError("No se pudo cargar el ranking");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [cargandoSesion, cargandoPreferencias, clienteId]);

  const rankingActual =
    pestana === "global"
      ? rankingGlobal
      : pestana === "semanal"
      ? rankingSemanal
      : rankingHoy;

  const miActual =
    pestana === "global"
      ? miGlobal
      : pestana === "semanal"
      ? miSemanal
      : miHoy;

  const configActual = CONFIG_PESTANA[pestana];

  const filasAMostrar = useMemo(() => {
    const filas = [...rankingActual];
    if (!miActual) return filas;

    const estaEnTop = filas.some(
      (f) => String(f.id_cliente) === String(miActual.id_cliente)
    );
    if (estaEnTop) return filas;

    return [
      ...filas,
      { __separator: true, id_cliente: "__sep" },
      { ...miActual, __meOnly: true },
    ];
  }, [rankingActual, miActual]);

  if (cargandoSesion || cargandoPreferencias || cargando) {
    return (
      <>
        <Navbar />
        <div className="index-container">
          <div className="home-loading-card">
            <p>Cargando ranking...</p>
          </div>
        </div>
      </>
    );
  }

  const nombreUsuario =
    usuario?.nombre || usuario?.display_name || usuario?.email || "CodeReasoner";

  return (
    <>
      <Navbar />

      <div className="ranking-pagina">
        {/* Header */}
        <header className="ranking-encabezado">
          <div className="ranking-encabezado-izquierda">
            <h1>{configActual.title}</h1>
            <p>{configActual.subtitle}</p>
          </div>

          {/* Tabs*/}
          <div className="ranking-pestanas">
            {PESTANAS.map((t) => (
              <button
                key={t.key}
                className={`ranking-pestana ${
                  pestana === t.key ? "esta-activa" : ""
                }`}
                onClick={() => setPestana(t.key)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        {/* Grid top cards */}
        <section className="ranking-grilla-tarjetas">
          {/* Tu posicion  */}
          <div className="ranking-tarjeta">
            <div className="ranking-tarjeta-cabecera">
              <h2>Tu posición</h2>
              <span className="ranking-tarjeta-etiqueta">
                {PESTANAS.find((x) => x.key === pestana)?.label}
              </span>
            </div>

            {error && <p className="ranking-error">{error}</p>}

            {miActual ? (
              <div className="ranking-yo-contenido">
                <div className="ranking-yo-posicion">#{miActual.posicion}</div>
                <div className="ranking-yo-info">
                  <p className="ranking-yo-nombre">{nombreUsuario}</p>
                  <p className="ranking-yo-meta"> Nivel <strong>{miActual.nivel}</strong> ·{" "}<strong>
                    {miActual[configActual.xpKey] ?? 0}</strong>{" "}
                    {configActual.xpLabel} ·{" "}
                    <strong>{miActual[configActual.solvedKey] ?? 0}</strong>{" "}
                    {configActual.solvedLabel}
                  </p>
                </div>
              </div>
            ) : (
              <p className="ranking-yo-vacio">
                Todavía no aparecés en este ranking
              </p>
            )}
          </div>

          {/* Actividad de hoy  */}
          <div className="ranking-tarjeta ranking-tarjeta--hoy">
            <div className="ranking-tarjeta-cabecera">
              <h2>Actividad de hoy</h2>
              <span className="ranking-tarjeta-etiqueta">Hoy</span>
            </div>

            <div className="hoy-estadisticas">
              <div className="hoy-estadistica">
                <span className="hoy-estadistica-etiqueta">XP ganada</span>
                <span className="hoy-estadistica-valor">{miHoy?.xp_hoy ?? 0}</span>
              </div>
              <div className="hoy-estadistica">
                <span className="hoy-estadistica-etiqueta">Problemas resueltos</span>
                <span className="hoy-estadistica-valor">
                  {miHoy?.desafios_hoy ?? 0}
                </span>
              </div>
              <div className="hoy-estadistica">
                <span className="hoy-estadistica-etiqueta">Nivel actual</span>
                <span className="hoy-estadistica-valor">
                  {miHoy?.nivel ?? miActual?.nivel ?? 1}
                </span>
              </div>
            </div>

            <p className="hoy-pie">
              Seguí sumando XP para escalar posiciones en el ranking del dia
            </p>
          </div>
        </section>

        {/* Tabla */}
        <section className="ranking-seccion-tabla">
          <div className="ranking-tabla-cabecera">
            <h2>Top {TOP_MOSTRAR}</h2>
            <p>
              Ordenado por {configActual.xpLabel.toLowerCase()}, luego{" "}
              {configActual.solvedLabel.toLowerCase()}.
            </p>
          </div>

          {rankingActual.length === 0 ? (
            <p className="ranking-vacio">
              Todavía no hay suficientes datos para mostrar el ranking
            </p>
          ) : (
            <div className="ranking-tabla-contenedor">
              <table className="ranking-tabla">
                <thead>
                  <tr>
                    <th className="col-posicion">#</th>
                    <th>Usuario</th>
                    <th className="col-centro">Nivel</th>
                    <th className="col-centro">{configActual.xpLabel}</th>
                    <th className="col-centro">{configActual.solvedLabel}</th>
                    <th className="col-centro">{configActual.lastLabel}</th>
                  </tr>
                </thead>

                <tbody>
                  {filasAMostrar.map((fila) => {
                    if (fila.__separator) {
                      return (
                        <tr key="sep" className="ranking-separador">
                          <td colSpan={6}>· · ·</td>
                        </tr>
                      );
                    }

                    const esYo =
                      String(fila.id_cliente) === String(clienteId);
                    const iconoMedalla = medalla(fila.posicion);

                    return (
                      <tr
                        key={fila.__meOnly ? "me-only" : fila.id_cliente}
                        className={`${esYo ? "ranking-row-yo" : ""} ${
                          fila.__meOnly ? "ranking-row-solo-yo" : ""
                        }`}
                      >
                        <td className="col-posicion">
                          <span className="posicion-pastilla">
                            {iconoMedalla ? iconoMedalla : fila.posicion}
                          </span>
                        </td>
                        <td>
                          <div className="ranking-usuario">
                            <div className="ranking-avatar">
                              {(fila.nombre || fila.email || "U")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div className="ranking-usuario-meta">
                              <span className="ranking-usuario-nombre">
                                {fila.nombre || fila.email || "Usuario"}
                              </span>
                              {esYo && (
                                <span className="ranking-chip-yo">Tú</span>
                              )}
                              {fila.__meOnly && (
                                <span className="ranking-chip-fuera">
                                  Fuera del top
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="col-centro">{fila.nivel ?? "-"}</td>
                        <td className="col-centro">
                          {fila[configActual.xpKey] ?? 0}
                        </td>
                        <td className="col-centro">
                          {fila[configActual.solvedKey] ?? 0}
                        </td>
                        <td className="col-centro">
                          {formatearFecha(fila[configActual.lastKey])}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
