import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Navbar from "../../components/Navbar";
import useGamificacion from "../../hooks/useGamificacion";
import useAchievements from "../../hooks/useAchievements";
import AchievementGrid from "../../components/AchievementGrid";
import "../../components/achievement.css";
import "./perfil.css";

const detectPlatform = (url = "") => {
  const u = (url || "").toLowerCase();
  if (u.includes("github.com")) return { key: "github", icon: "fa-brands fa-github", label: "GitHub" };
  if (u.includes("linkedin.com")) return { key: "linkedin", icon: "fa-brands fa-linkedin", label: "LinkedIn" };
  if (u.includes("twitter.com") || u.includes("x.com")) return { key: "twitter", icon: "fa-brands fa-x-twitter", label: "Twitter/X" };
  if (u.includes("instagram.com")) return { key: "instagram", icon: "fa-brands fa-instagram", label: "Instagram" };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return { key: "youtube", icon: "fa-brands fa-youtube", label: "YouTube" };
  if (u.includes("twitch.tv")) return { key: "twitch", icon: "fa-brands fa-twitch", label: "Twitch" };
  if (u.includes("facebook.com")) return { key: "facebook", icon: "fa-brands fa-facebook", label: "Facebook" };
  return { key: "web", icon: "fa-solid fa-globe", label: "Website" };
};

const parseSocials = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch (_) {}
  return String(raw)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const stringifySocials = (arr) => {
  try { return JSON.stringify(arr); } catch { return (arr || []).join(", "); }
};

/* barra progreso */
function ProgressBar({ current, total }) {
  const pct = Math.max(0, Math.min(100, total > 0 ? (current / total) * 100 : 0));
  return (
    <div className="p-progress">
      <div className="p-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="p-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* Drawer feed */
function FeedDrawer({ open, onClose, feed }) {
  if (!open) return null;
  return (
    <div className="p-drawer">
      <div className="p-drawer__backdrop" onClick={onClose} />
      <aside className="p-drawer__panel">
        <div className="p-drawer__head">
          <h3>Actividad reciente</h3>
          <button className="p-btn p-btn--ghost" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        {(!feed || feed.length === 0) ? (
          <div className="p-empty">Sin movimientos de XP todavía.</div>
        ) : (
          <ul className="p-feed">
            {feed.map((f, i) => (
              <li key={i} className="p-feed__item">
                <div className="p-feed__left">
                  <div className="p-feed__xp">+{f.puntos} XP</div>
                  <div className="p-feed__meta">
                    {f.motivo?.tipo || "otro"}{f.motivo?.detalle ? ` · ${JSON.stringify(f.motivo.detalle)}` : ""}
                  </div>
                </div>
                <time className="p-feed__time">{new Date(f.fecha).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

export default function Perfil() {
  const [perfil, setPerfil] = useState({ biografia: "", skills: "", redes_sociales: "", foto_perfil: "" });
  const [mensaje, setMensaje] = useState("");
  const [preview, setPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newSocial, setNewSocial] = useState("");
  const [socials, setSocials] = useState([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const id_cliente = useMemo(() => parseInt(localStorage.getItem("cliente") || "0", 10), []);
  const { data: gami, loading: gLoading } = useGamificacion(id_cliente);

  const { loading: aLoading, error: aError, defs, unlocked, locked, recalc } = useAchievements(id_cliente);

  const avatarDropRef = useRef(null);
  const fileInputRef = useRef(null);

  const cargarPerfil = async () => {
    if (!id_cliente) return;
    try {
      const res = await axios.get(`http://localhost:5000/perfil/${id_cliente}`);
      const p = res.data || {};
      setPerfil(p);
      if (p?.foto_perfil) setPreview(p.foto_perfil);
      setSocials(parseSocials(p?.redes_sociales));
    } catch (err) {
      console.error("Error cargando perfil:", err);
    }
  };

  useEffect(() => { cargarPerfil(); }, []);

  //Recalcular logros cuando se entra
  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await recalc();
      if (!mounted) return;
      if (Array.isArray(r?.nuevos) && r.nuevos.length) {
        r.nuevos.forEach((l) => {
          toast.success(`¡Logro desbloqueado! ${l.icono || "🏆"} ${l.titulo}${l.xp_otorgado ? ` (+${l.xp_otorgado} XP)` : ""}`);
        });
      }
    })();
    return () => { mounted = false; };
  }, [recalc]);

  const handleSave = async () => {
    try {
      setSavingProfile(true);
      const body = { ...perfil, redes_sociales: stringifySocials(socials) };
      await axios.put(`http://localhost:5000/perfil/${id_cliente}`, body);
      setMensaje("Perfil actualizado ✅");
      setEditMode(false);
      setTimeout(() => setMensaje(""), 1500);
    } catch (err) {
      console.error(err);
      setMensaje("Error al actualizar ❌");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => { setEditMode(false); cargarPerfil(); };

  const doUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("foto", file);
    try {
      setUploading(true);
      const res = await axios.post(`http://localhost:5000/perfil/${id_cliente}/foto`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url;
      setPerfil((p) => ({ ...p, foto_perfil: url }));
      setPreview(url);
      setMensaje("Foto actualizada ✅");
      setTimeout(() => setMensaje(""), 1200);
    } catch (err) {
      console.error("Error subiendo foto:", err);
      setMensaje("Error al subir la foto ❌");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await doUpload(file);
  };

  const handleAvatarClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  // Drag&drop avatar
  useEffect(() => {
    const el = avatarDropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => { prevent(e); const file = e.dataTransfer.files?.[0]; if (file) doUpload(file); el.classList.remove("is-dragover"); };
    const onDragOver = (e) => { prevent(e); el.classList.add("is-dragover"); };
    const onDragLeave = (e) => { prevent(e); el.classList.remove("is-dragover"); };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      await axios.put(`http://localhost:5000/perfil/${id_cliente}`, { ...perfil, foto_perfil: null });
      setPreview(null);
      setPerfil((p) => ({ ...p, foto_perfil: null }));
      setMensaje("Foto eliminada ✅");
      setTimeout(() => setMensaje(""), 1200);
    } catch (e) {
      console.error(e);
      setMensaje("No se pudo eliminar la foto ❌");
    } finally {
      setUploading(false);
    }
  };

  const addSocial = () => {
    const clean = (newSocial || "").trim();
    if (!clean || socials.includes(clean)) return;
    setSocials([...socials, clean]);
    setNewSocial("");
  };
  const removeSocial = (idx) => setSocials(socials.filter((_, i) => i !== idx));

  const skillsArr = useMemo(() => {
    const raw = perfil?.skills || "";
    return raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  }, [perfil.skills]);

  const progreso = gami?.progreso ?? { xpEnNivel: 0, xpParaSubir: 100, nextLevelRemaining: 100 };
  const hoy = gami?.hoy ?? {};
  const streak = gami?.streak ?? 0;

  return (
    <>
      <Navbar />
      <div className="p-page">
        <div className="p-wrap">
          {/* Header */}
          <header className="p-header">
            <div className="p-header__left">
              <div
                className={`p-avatar ${uploading ? "is-uploading" : ""} ${preview ? "has-photo" : ""}`}
                ref={avatarDropRef}
                role="button"
                tabIndex={0}
                onClick={handleAvatarClick}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleAvatarClick()}
                aria-label="Cambiar foto de perfil"
                title="Click o arrastrá una imagen para actualizar tu foto"
              >
                {preview ? (
                  <img src={preview} alt="Avatar" />
                ) : (
                  <div className="p-avatar__ph"><i className="fa-solid fa-user" /></div>
                )}

                {/* Overlay cam */}
                <div className="p-avatar__overlay">
                  <i className="fa-solid fa-camera" aria-hidden="true" />
                </div>

                {/* Quitar foto sio hay*/}
                {preview && (
                  <button
                    className="p-avatar__remove"
                    onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }}
                    title="Quitar foto"
                    aria-label="Quitar foto"
                    disabled={uploading}
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}

                {/* Input hidden */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="visually-hidden"
                />
              </div>

              <div className="p-user">
                <h1>Mi Perfil</h1>
              </div>
            </div>

            <div className="p-header__right">
              {!editMode ? (
                <div className="p-actions">
                  <button className="p-btn" onClick={() => setEditMode(true)}>
                    <i className="fa-solid fa-pen" /> Editar
                  </button>
                </div>
              ) : (
                <div className="p-actions">
                  <button className="p-btn" onClick={handleSave} disabled={savingProfile}>
                    <i className="fa-solid fa-floppy-disk" /> {savingProfile ? "Guardando…" : "Guardar"}
                  </button>
                  <button className="p-btn p-btn--ghost" onClick={handleCancel}>
                    <i className="fa-solid fa-xmark" /> Cancelar
                  </button>
                </div>
              )}
            </div>
          </header>

          {mensaje && <div className="p-alert">{mensaje}</div>}

          {/* Grid principal*/}
          <div className="p-grid">
            {/* LEFT */}
            <section className="p-card">
              {/*Bio */}
              <div className="p-block">
                <div className="p-block__head">
                  <h3>Biografía</h3>
                  {editMode && <small className="p-muted" aria-live="polite">{perfil.biografia?.length || 0}/600</small>}
                </div>
                {!editMode ? (
                  <p className={`p-bio ${(!perfil.biografia || !perfil.biografia.trim()) ? "is-empty" : ""}`}>
                    {perfil.biografia?.trim() || "Aún no agregaste una biografía. Contanos en qué estás trabajando y qué te apasiona."}
                  </p>
                ) : (
                  <textarea
                    className="p-input p-textarea"
                    rows={4}
                    maxLength={600}
                    value={perfil.biografia || ""}
                    placeholder="Ej.: Desarrollador full-stack con foco en educación, creé CodeReasonix para mejorar la lógica con desafíos diarios…"
                    onChange={(e) => setPerfil({ ...perfil, biografia: e.target.value })}
                  />
                )}
              </div>

              {/* Skills */}
              <div className="p-block">
                <div className="p-block__head"><h3>Skills</h3></div>
                {!editMode ? (
                  <div className="p-tags">
                    {skillsArr.length > 0 ? skillsArr.map((s, i) => <span className="p-tag" key={i}>{s}</span>) : <span className="p-muted">Sin skills cargadas.</span>}
                  </div>
                ) : (
                  <input className="p-input" placeholder="Separá por coma. Ej: JavaScript, React, SQL, Node, Arduino"
                    value={perfil.skills || ""} onChange={(e) => setPerfil({ ...perfil, skills: e.target.value })} />
                )}
              </div>

              {/* Redes */}
              <div className="p-block">
                <div className="p-block__head"><h3>Redes</h3></div>
                {!editMode ? (
                  <ul className="p-socials">
                    {socials.length === 0 ? (
                      <li className="p-muted">No agregaste redes aún.</li>
                    ) : (
                      socials.map((url, i) => {
                        const p = detectPlatform(url);
                        return (
                          <li key={i}>
                            <i className={p.icon} />
                            <a href={/^https?:\/\//.test(url) ? url : `https://${url}`} target="_blank" rel="noreferrer">{p.label}</a>
                            <span className="p-socials__url">{url}</span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : (
                  <>
                    <div className="p-addsocial">
                      <input className="p-input" placeholder="Pegá una URL: https://github.com/tuuser" value={newSocial} onChange={(e) => setNewSocial(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && addSocial()} />
                      <button className="p-btn" onClick={addSocial}><i className="fa-solid fa-plus" /> Agregar</button>
                    </div>
                    <ul className="p-socials p-socials--edit">
                      {socials.map((url, i) => {
                        const p = detectPlatform(url);
                        return (
                          <li key={i}>
                            <i className={p.icon} />
                            <span>{p.label}</span>
                            <span className="p-socials__url">{url}</span>
                            <button className="p-iconbtn" onClick={() => removeSocial(i)}><i className="fa-solid fa-trash" /></button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>

              {/* Logros*/}
              <div className="p-block">
                <div className="p-block__head">
                  <h3>Mis logros</h3>
                  <span className="p-muted">
                    {aLoading ? "Cargando…" : `${(unlocked?.length || 0)} desbloqueados · ${(locked?.length || 0)} por desbloquear`}
                  </span>
                </div>
                {aError && <div className="p-alert">Error logros: {aError}</div>}
                {aLoading ? (
                  <div className="p-empty">Cargando logros…</div>
                ) : (
                  <AchievementGrid defs={defs} unlocked={unlocked} locked={locked} />
                )}
              </div>
            </section>

            {/* RIGHT */}
            <aside className="p-card p-card--right">
              <div className="p-block">
                <div className="p-block__head"><h3>Progreso</h3></div>

                <div className="p-kpis">
                  <div className="p-kpi"><div className="p-kpi__label">Nivel</div><div className="p-kpi__value">{gLoading ? "…" : (gami?.nivel ?? 1)}</div></div>
                  <div className="p-kpi"><div className="p-kpi__label">XP total</div><div className="p-kpi__value">{gLoading ? "…" : (gami?.xp_total ?? 0)}</div></div>
                  <div className="p-kpi"><div className="p-kpi__label">Racha</div><div className="p-kpi__value">🔥 {streak}</div></div>
                </div>

                <ProgressBar current={progreso.xpEnNivel} total={progreso.xpParaSubir} />
                <div className="p-progressmeta">
                  <span>{progreso.xpEnNivel}/{progreso.xpParaSubir} XP</span>
                  <span>Subís en {progreso.nextLevelRemaining} XP</span>
                </div>
              </div>

              <div className="p-block">
                <div className="p-block__head"><h3>Hoy</h3></div>
                <ul className="p-today">
                  {[
                    { key: "login", label: "Login diario", icon: "fa-solid fa-key" },
                    { key: "resolver_ejercicio", label: "Resolver ejercicio", icon: "fa-solid fa-terminal" },
                    { key: "primer_resuelto_dia", label: "Primer resuelto del día (bonus)", icon: "fa-solid fa-sparkles" },
                  ].map(({ key, label, icon }) => {
                    const t = hoy[key] || { done: false, xp: 0 };
                    return (
                      <li key={key} className={`p-today__item ${t.done ? "is-done" : ""}`}>
                        <div className="p-today__left">
                          <i className={icon} />
                          <div>
                            <div className="p-today__label">{label}</div>
                            <div className="p-today__sub">{t.done ? `+${t.xp ?? 0} XP` : "Pendiente"}</div>
                          </div>
                        </div>
                        <div className={`p-dot ${t.done ? "ok" : ""}`} aria-hidden="true" />
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="p-block">
                <div className="p-block__head">
                  <h3>Actividad reciente</h3>
                  <button className="p-btn p-btn--ghost" onClick={() => setFeedOpen(true)}>
                    <i className="fa-solid fa-list" /> Ver todo
                  </button>
                </div>
                {(!gami?.feed || gami.feed.length === 0) ? (
                  <div className="p-empty">Sin movimientos aún.</div>
                ) : (
                  <ul className="p-mini-feed">
                    {gami.feed.slice(0, 5).map((f, i) => (
                      <li key={i}>
                        <span className="p-badge p-badge--xp">+{f.puntos} XP</span>
                        <span className="p-mini-feed__meta">{f.motivo?.tipo || "otro"}</span>
                        <time className="p-mini-feed__time">{new Date(f.fecha).toLocaleDateString()}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <FeedDrawer open={feedOpen} onClose={() => setFeedOpen(false)} feed={gami?.feed || []} />
    </>
  );
}
