import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import Navbar from "../../components/Navbar";
import useGamificacion from "../../hooks/useGamificacion";
import useAchievements from "../../hooks/useAchievements";
import AchievementGrid from "../../components/AchievementGrid";
import AccountSettingsModal from "../../components/AccountSettingsModal";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../../components/achievement.css";
import "./perfil.css";

const FRAME_TIERS = [
  { id: "basic",   minLevel: 1,  label: "Clásico" },
  { id: "bronze",  minLevel: 5,  label: "Bronce" },
  { id: "silver",  minLevel: 10, label: "Plata" },
  { id: "gold",    minLevel: 20, label: "Oro" },
  { id: "diamond", minLevel: 50, label: "Diamante" },
];

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
    // eslint-disable-next-line 
  } catch (_) {}
  return String(raw)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const stringifySocials = (arr) => { try { return JSON.stringify(arr); } catch { return (arr || []).join(", "); } };

/*barra progreso */
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
  const [perfil, setPerfil] = useState({
    biografia: "",
    skills: "",
    redes_sociales: "",
    foto_perfil: "",
    display_name: "",
    nombre: "",
    apellido: "",
    username: "",
    avatar_frame: "basic",
    banner_url: ""
  });
  const [mensaje, setMensaje] = useState("");
  const [preview, setPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newSocial, setNewSocial] = useState("");
  const [socials, setSocials] = useState([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usuario, setUsuario] = useState({ id_usuario: null, nombre: "", email: "" });

  const id_cliente = useMemo(() => parseInt(localStorage.getItem("cliente") || "0", 10), []);
  // eslint-disable-next-line 
  const { data: gami, loading: gLoading, error: gError, refetch } = useGamificacion(id_cliente);
  // eslint-disable-next-line 
  const { loading: aLoading, error: aError, defs, unlocked, locked, refresh, recalc } = useAchievements(id_cliente);
  // eslint-disable-next-line 
  const [checking, setChecking] = useState(false);

  const avatarDropRef = useRef(null);
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const cargarPerfil = async () => {
    if (!id_cliente) return;
    try {
      const [pRes, uRes] = await Promise.all([
        axios.get(`http://localhost:5000/perfil/${id_cliente}`),
        axios.get(`http://localhost:5000/usuarios/by-cliente/${id_cliente}`)
      ]);

      const p = pRes.data || {};
      setPerfil((prev) => ({ ...prev, ...p }));
      if (p?.foto_perfil) setPreview(p.foto_perfil);
      setSocials(parseSocials(p?.redes_sociales));

      const u = uRes.data || {};
      setUsuario({
        id_usuario: u.id_usuario ?? null,
        nombre: u.nombre ?? "",
        email: u.email ?? ""
      });
    } catch (err) {
      console.error("Error cargando perfil/usuario:", err);
    }
  };

  useEffect(() => { cargarPerfil(); }, []);

  const handleSave = async () => {
    try {
      setSavingProfile(true);

      const nivelActual = gami?.nivel ?? 1;
      const unlockedFrames = FRAME_TIERS.filter((f) => nivelActual >= f.minLevel);
      const selectedFrameId = (() => {
        const requested = perfil.avatar_frame || "basic";
        const exists = FRAME_TIERS.some((f) => f.id === requested);
        if (exists) return requested;
        if (unlockedFrames.length) return unlockedFrames[unlockedFrames.length - 1].id;
        return "basic";
      })();

      const body = {
        biografia: perfil.biografia ?? "",
        skills: perfil.skills ?? "",
        redes_sociales: stringifySocials(socials),
        foto_perfil: perfil.foto_perfil ?? null,
        avatar_frame: selectedFrameId,
        banner_url: perfil.banner_url ?? null
      };
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
      toast.success("Foto actualizada");
    } catch (err) {
      console.error("Error subiendo foto:", err);
      toast.error("Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    await doUpload(file);
  };

  // Banner upload
  const doBannerUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("banner", file);
    try {
      setBannerUploading(true);
      const res = await axios.post(`http://localhost:5000/perfil/${id_cliente}/banner`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url;
      setPerfil((p) => ({ ...p, banner_url: url }));
      toast.success("Banner actualizado");
    } catch (err) {
      console.error("Error subiendo banner:", err);
      toast.error("Error al subir el banner");
    } finally {
      setBannerUploading(false);
    }
  };

  const handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    await doBannerUpload(file);
  };

  const handleBannerClick = () => {
    if (bannerInputRef.current) bannerInputRef.current.click();
  };

  const handleBannerRemove = async () => {
    try {
      setBannerUploading(true);
      await axios.put(`http://localhost:5000/perfil/${id_cliente}`, { banner_url: null });
      setPerfil((p) => ({ ...p, banner_url: null }));
      toast.success("Banner eliminado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el banner");
    } finally {
      setBannerUploading(false);
    }
  };

  //avatar
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

  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleRemovePhoto = async () => {
    try {
      setUploading(true);
      await axios.put(`http://localhost:5000/perfil/${id_cliente}`, { foto_perfil: null });
      setPreview(null);
      setPerfil((p) => ({ ...p, foto_perfil: null }));
      toast.success("Foto eliminada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar la foto");
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
  const nivelActual = gami?.nivel ?? 1;

  const unlockedFrames = useMemo(() => FRAME_TIERS.filter((f) => nivelActual >= f.minLevel), [nivelActual]);
  const selectedFrameId = useMemo(() => {
    const requested = perfil.avatar_frame || "basic";
    const exists = FRAME_TIERS.some((f) => f.id === requested);
    if (exists) return requested;
    if (unlockedFrames.length) return unlockedFrames[unlockedFrames.length - 1].id;
    return "basic";
  }, [perfil.avatar_frame, unlockedFrames]);

  const displayName = (perfil.display_name || "").trim() || usuario.nombre || "Mi Perfil";
  const username = (perfil.username || "").trim();

  return (
    <>
      <Navbar />
      <div className="p-page">
        <div className="p-wrap">
          {/* Banner tipo Twitter */}
          <div
            className={`p-banner ${bannerUploading ? "is-uploading" : ""}`}
            style={perfil.banner_url ? { backgroundImage: `url(${perfil.banner_url})` } : {}}
            onClick={handleBannerClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleBannerClick()}
            title="Clic para cambiar tu banner"
          >
            <div className="p-banner__overlay" />
            <div className="p-banner__actions">
              <button
                type="button"
                className="p-banner__btn"
                onClick={(e) => { e.stopPropagation(); handleBannerClick(); }}
              >
                <i className="fa-solid fa-camera" />
                <span>Cambiar banner</span>
              </button>
              {perfil.banner_url && (
                <button
                  type="button"
                  className="p-banner__btn"
                  onClick={(e) => { e.stopPropagation(); handleBannerRemove(); }}
                  disabled={bannerUploading}
                >
                  <i className="fa-solid fa-trash" />
                  <span>Quitar</span>
                </button>
              )}
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={handleBannerChange} />
          </div>

          {/* Header + avatar + nombre/username abajo */}
          <div className="p-profile-header">
            <div className="p-profile-header__top">
              <div className="p-avatar-shell">
                <div
                  className={`p-avatar p-avatar--frame-${selectedFrameId} ${uploading ? "is-uploading" : ""}`}
                  ref={avatarDropRef}
                  onClick={handleAvatarClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleAvatarClick()}
                  title="Clic o arrastrá una imagen para actualizar tu foto"
                >
                  {preview ? <img src={preview} alt="Avatar" /> : <div className="p-avatar__ph"><i className="fa-solid fa-user" /></div>}

                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />

                  <button
                    className="p-btn p-btn--tiny p-btn--ghost p-avatar__upload"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAvatarClick(); }}
                    aria-label="Cambiar foto de perfil"
                    title="Cambiar foto de perfil"
                  >
                    <i className="fa-solid fa-camera" />
                  </button>

                  {preview && (
                    <button
                      className="p-btn p-btn--tiny p-btn--ghost p-avatar__remove"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }}
                      disabled={uploading}
                      title="Quitar foto"
                      aria-label="Quitar foto"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-header__right">
                {!editMode ? (
                  <div className="p-actions">
                    <button className="p-iconbtn p-iconbtn--round" title="Ajustes de cuenta" onClick={() => setSettingsOpen(true)}>
                      <i className="fa-solid fa-gear" />
                    </button>
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
            </div>

            <div className="p-profile-header__bottom">
              <div className="p-user">
                <h1 className="p-displayname">{displayName}</h1>
                <div className="p-user__meta">
                  {username && <span className="p-username">@{username}</span>}
                  <span className="p-level-chip">Nivel {gami?.nivel ?? 1}</span>
                </div>

                {/* Selector de marco (solo en modo editar) */}
                {editMode && (
                  <div className="p-frame-picker">
                    {FRAME_TIERS.map((frame) => {
                      const unlockedFrame = nivelActual >= frame.minLevel;
                      const isActive = selectedFrameId === frame.id;
                      return (
                        <button
                          key={frame.id}
                          type="button"
                          className={`p-frame-chip ${isActive ? "is-active" : ""} ${!unlockedFrame ? "is-locked" : ""}`}
                          onClick={() => unlockedFrame && setPerfil((prev) => ({ ...prev, avatar_frame: frame.id }))}
                          disabled={!unlockedFrame}
                          title={unlockedFrame ? `${frame.label} (nivel ${frame.minLevel}+ desbloqueado)` : `Se desbloquea al nivel ${frame.minLevel}`}
                        >
                          <span className={`p-frame-chip__preview p-frame-chip__preview--${frame.id}`} />
                          <span className="p-frame-chip__label">{frame.label}</span>
                          <span className="p-frame-chip__lvl">Lv {frame.minLevel}+</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {mensaje && <div className="p-alert">{mensaje}</div>}

          {/* Grid principal */}
          <div className="p-grid">
            {/* Left */}
            <section className="p-card">
              {/* Bio*/}
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
                  <input
                    className="p-input"
                    placeholder="Separá por coma. Ej: JavaScript, React, SQL, Node, Arduino"
                    value={perfil.skills || ""}
                    onChange={(e) => setPerfil({ ...perfil, skills: e.target.value })}
                  />
                )}
              </div>

              {/*Redes */}
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
                      <input
                        className="p-input"
                        placeholder="Pegá una URL: https://github.com/tuuser"
                        value={newSocial}
                        onChange={(e) => setNewSocial(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addSocial()}
                      />
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

              {/* Logros */}
              <div className="p-block">
                <div className="p-block__head">
                  <h3>Mis logros</h3>
                  <div className="p-actions">
                    <span className="p-muted" style={{ marginRight: 8 }}>
                      {aLoading ? "Cargando…" : `${(unlocked?.length || 0)} desbloqueados · ${(locked?.length || 0)} por desbloquear`}
                    </span>
                  </div>
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
                <div className="p-block__head">
                  <h3>Progreso</h3>
                </div>

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
                        <span className="p-mini-feed__xp">+{f.puntos} XP</span>
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

      {/* Modal ajustes */}
      <AccountSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        id_cliente={id_cliente}
        onIdentityUpdated={(partial) => {
          
          if ("display_name" in partial || "username" in partial) {
            setPerfil((prev) => ({ ...prev, ...partial }));
          }

          if ("nombre" in partial || "email" in partial) {
            setUsuario((u) => ({ ...u, ...partial }));
          }
        }}
      />
    </>
  );
}
