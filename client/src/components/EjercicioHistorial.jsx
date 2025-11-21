import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import "./ejercicio-historial.css";
import API_BASE from "../config/api";

export default function EjercicioHistorial({
  idEjercicio,
  idCliente,
  onCountChange,
  onLoadFromHistory,
}) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchingCode, setFetchingCode] = useState(null); 
  const [expanded, setExpanded] = useState(null); 
  const [filters, setFilters] = useState({ lenguaje: "", estado: "" }); 
  const [page, setPage] = useState({ limit: 30, offset: 0 });

  const hasMore = total > items.length;

  const fetchList = async (reset = false) => {
    if (!idEjercicio || !idCliente) return;
    try {
      if (reset) setLoading(true);
      const params = new URLSearchParams({
        limit: String(page.limit),
        offset: String(reset ? 0 : page.offset),
      });
      if (filters.lenguaje) params.set("lenguaje", filters.lenguaje);
      if (filters.estado) params.set("estado", filters.estado);

      const res = await fetch(`${API_BASE}/historial/${idCliente}/ejercicio/${idEjercicio}?` + params.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (reset) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        onCountChange?.(data.total || 0);
        setPage((p) => ({ ...p, offset: (data.items || []).length }));
      } else {
        setItems((prev) => [...prev, ...(data.items || [])]);
        setTotal(data.total || 0);
        onCountChange?.(data.total || 0);
        setPage((p) => ({ ...p, offset: prevLength => prevLength }));
      }
    } catch (err) {
      console.error("[HISTORIAL] list fail", err);
      toast.error("No se pudo cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage({ limit: 30, offset: 0 });
    fetchList(true);
    // eslint-disable-next-line 
  }, [idEjercicio, idCliente]);

  useEffect(() => {
    const t = setTimeout(() => fetchList(true), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line 
  }, [filters]);

  const stats = useMemo(() => {
    const aprob = items.filter((i) => i.resultado).length;
    return {
      intentos: total,
      aprobados: aprob,
      ratio: total > 0 ? (aprob / total) : 0,
    };
  }, [items, total]);

  const loadMore = () => {
    if (!hasMore) return;
    setPage((p) => ({ ...p, offset: p.offset + p.limit }));
    fetchList(false);
  };

  const fetchCode = async (id_submit_final) => {
    if (!id_submit_final) return;
    setFetchingCode(id_submit_final);
    try {
      const res = await fetch(`${API_BASE}/historial/submit/${id_submit_final}?id_cliente=${idCliente}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const item = data.item;
      if (!item?.codigo_fuente) {
        toast.info("El envío no tiene código guardado.");
        return;
      }
      onLoadFromHistory?.({
        lenguaje: item.lenguaje,
        codigo: item.codigo_fuente,
      });
      toast.success("Código cargado en el editor");
    } catch (err) {
      console.error("[HISTORIAL] code fail", err);
      toast.error(err.message || "No se pudo cargar el código del envío");
    } finally {
      setFetchingCode(null);
    }
  };

  return (
    <div className="hist-box" id="exercise-history">
      <div className="hist-head">
        <h3 className="hist-title">
          <i className="fa-solid fa-clock-rotate-left" /> Historial
        </h3>
        <div className="hist-filters">
          <select
            value={filters.lenguaje}
            onChange={(e) => setFilters((f) => ({ ...f, lenguaje: e.target.value }))}
            title="Filtrar por lenguaje"
          >
            <option value="">Lenguaje: todos</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
          </select>

          <select
            value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
            title="Filtrar por estado"
          >
            <option value="">Estado: todos</option>
            <option value="aceptado">Aceptados</option>
            <option value="rechazado">Rechazados</option>
          </select>

          <div className="hist-kpis">
            <span className="kpi">Intentos: <strong>{stats.intentos}</strong></span>
            <span className="kpi">Aprobados: <strong className="ok">{stats.aprobados}</strong></span>
            <span className="kpi">Ratio: <strong>{(stats.ratio * 100).toFixed(0)}%</strong></span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="hist-empty">Cargando historial…</div>
      ) : total === 0 ? (
        <div className="hist-empty">Aún no tenés envíos en este ejercicio.</div>
      ) : (
        <>
          {/* Barras */}
          <div className="hist-strip">
            {items.map((it) => (
              <button
                key={it.id_submit_final}
                className={`hist-chip ${it.resultado ? "ok" : "fail"} ${expanded === it.id_submit_final ? "is-active" : ""}`}
                title={`${new Date(it.fecha).toLocaleString()} • ${it.lenguaje.toUpperCase()} • ${it.resultado ? "ACEPTADO" : "RECHAZADO"}`}
                onClick={() => setExpanded((e) => e === it.id_submit_final ? null : it.id_submit_final)}
              />
            ))}
          </div>

          {/* Lista */}
          <div className="hist-list">
            {items.map((it) => {
              const isOpen = expanded === it.id_submit_final;
              return (
                <div key={it.id_submit_final} className={`hist-row ${isOpen ? "is-open" : ""}`}>
                  <div className="hist-row-main" onClick={() => setExpanded(isOpen ? null : it.id_submit_final)}>
                    <span className={`dot ${it.resultado ? "ok" : "fail"}`} />
                    <span className="date">{new Date(it.fecha).toLocaleString()}</span>
                    <span className="lang">{it.lenguaje}</span>
                    <span className={`state ${it.resultado ? "ok" : "fail"}`}>{it.resultado ? "ACEPTADO" : "RECHAZADO"}</span>
                    <span className="meta">
                      {it.aceptados != null && it.totales != null ? `${it.aceptados}/${it.totales}` : (it.puntaje != null ? `Score: ${it.puntaje}` : "")}
                      {it.tiempo_ejecucion != null ? ` • ${it.tiempo_ejecucion.toFixed ? it.tiempo_ejecucion.toFixed(2) : it.tiempo_ejecucion}s` : ""}
                      {it.memoria_usada != null ? ` • ${it.memoria_usada} KB` : ""}
                    </span>
                    <i className="fa-solid fa-chevron-down caret" />
                  </div>

                  {isOpen && (
                    <div className="hist-row-detail">
                      <div className="detail-meta">
                        <div><strong>Fecha:</strong> {new Date(it.fecha).toLocaleString()}</div>
                        <div><strong>Lenguaje:</strong> {it.lenguaje}</div>
                        <div><strong>Estado:</strong> {it.resultado ? "ACEPTADO" : "RECHAZADO"}</div>
                        {it.aceptados != null && it.totales != null && (
                          <div><strong>Casos:</strong> {it.aceptados}/{it.totales}</div>
                        )}
                        {it.puntaje != null && <div><strong>Puntaje:</strong> {it.puntaje}</div>}
                        {it.tiempo_ejecucion != null && <div><strong>Tiempo:</strong> {it.tiempo_ejecucion}s</div>}
                        {it.memoria_usada != null && <div><strong>Memoria:</strong> {it.memoria_usada} KB</div>}
                      </div>

                      <div className="detail-actions">
                        <button
                          className="ex-btn"
                          onClick={() => fetchCode(it.id_submit_final)}
                          disabled={fetchingCode === it.id_submit_final}
                          title="Cargar código en el editor"
                        >
                          {fetchingCode === it.id_submit_final ? "Cargando…" : "Cargar en editor"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="hist-load-more">
              <button className="ex-btn" onClick={loadMore}>Cargar más</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
