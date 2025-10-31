import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import "./account-settings.css";

const API = "http://localhost:5000"; 

function Strength({ value }) {
  const label = value >= 80 ? "Fuerte" : value >= 50 ? "Media" : "Débil";
  return (
    <div className="as-strength">
      <div className="as-strength__bar">
        <div className="as-strength__fill" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="as-strength__label">{label}</span>
    </div>
  );
}

const scorePassword = (pw) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s += 25;
  if (pw.length >= 12) s += 15;
  if (/[a-z]/.test(pw)) s += 15;
  if (/[A-Z]/.test(pw)) s += 15;
  if (/\d/.test(pw)) s += 15;
  if (/[^A-Za-z0-9]/.test(pw)) s += 15;
  return Math.min(100, s);
};

export default function AccountSettingsModal({ open, onClose, id_cliente, onIdentityUpdated }) {
  const [tab, setTab] = useState("cuenta");
  const [loading, setLoading] = useState(false);

  // usuario (tabla usuario)
  const [usuario, setUsuario] = useState({
    id_usuario: null,
    nombre: "",
    email: "",
  });

  // perfil (display_name y username)
  const [perfil, setPerfil] = useState({
    display_name: "",
    username: "",
  });

  // formularios
  const [tmpNombre, setTmpNombre] = useState("");
  const [tmpEmail, setTmpEmail] = useState("");

  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const passScore = scorePassword(newPass);
  const canChangePass = newPass.length >= 8 && newPass === newPass2 && newPass !== currPass;

  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || !id_cliente) return;
    (async () => {
      setLoading(true);
      try {
        //usuario de cliente
        const u = await axios.get(`${API}/usuarios/by-cliente/${id_cliente}`);
        const user = u.data || {};
        setUsuario({
          id_usuario: user.id_usuario,
          nombre: user.nombre || "",
          email: user.email || "",
        });
        setTmpNombre(user.nombre || "");
        setTmpEmail(user.email || "");

        //perfil
        const p = await axios.get(`${API}/perfil/${id_cliente}`);
        const pp = p.data || {};
        setPerfil({
          display_name: pp.display_name || "",
          username: pp.username || "",
        });
      } catch (e) {
        console.error(e);
        toast.error("No se pudo cargar la cuenta");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, id_cliente]);

  //cerrar esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const maskedEmail = useMemo(() => {
    const em = usuario.email || "";
    const [u, d] = em.split("@");
    if (!u || !d) return em;
    const shown = u.slice(0, Math.min(3, u.length));
    return `${shown}${"*".repeat(Math.max(0, u.length - shown.length))}@${d}`;
  }, [usuario.email]);

//Guardar identidad perfil (display_name y username)
const saveProfileIdentity = async () => {
  const payload = {
    display_name: (perfil.display_name || "").trim() || null,
    username: (perfil.username || "").trim() || null,
  };
  try {
    setLoading(true);
    await axios.put(`${API}/perfil/${id_cliente}`, payload);
    toast.success("Perfil actualizado");
    onIdentityUpdated?.(payload);
  } catch (e) {
    console.error(e);
    if (e?.response?.status === 409) {
      toast.error("Ese @usuario ya está en uso.");
    } else {
      const apiMsg = e?.response?.data?.error || "No se pudo actualizar el perfil";
      toast.error(apiMsg);
    }
  } finally {
    setLoading(false);
  }
};


  //Guardar nombre (tabla usuario)
  const saveLegalName = async () => {
    if (!usuario.id_usuario) return;
    const name = (tmpNombre || "").trim();
    if (!name) return toast.info("Ingresá un nombre");
    try {
      setLoading(true);
      await axios.put(`${API}/usuarios/${usuario.id_usuario}`, { nombre: name });
      setUsuario((u) => ({ ...u, nombre: name }));
      toast.success("Nombre actualizado");
      onIdentityUpdated?.({ nombre: name }); // ✅ refresca header
    } catch (e) {
      console.error(e);
      const apiMsg = e?.response?.data?.error || "No se pudo actualizar el nombre";
      toast.error(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  //Cambiar email (tabla usuario)
  const submitEmailChange = async () => {
    if (!usuario.id_usuario) return;
    const target = (tmpEmail || "").trim();
    if (!target) return toast.info("Ingresá el nuevo email");
    if (target.toLowerCase() === (usuario.email || "").toLowerCase()) {
      return toast.info("El nuevo email es igual al actual.");
    }
    try {
      setLoading(true);
      await axios.put(`${API}/usuarios/${usuario.id_usuario}`, { email: target });
      setUsuario((u) => ({ ...u, email: target }));
      toast.success("Email actualizado");
      onIdentityUpdated?.({ email: target }); 
    } catch (e) {
      console.error(e);
      const apiMsg = e?.response?.data?.error || "No se pudo actualizar el email";
      toast.error(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  //Cambiar contraseña (tabla usuario) 
  const submitPasswordChange = async () => {
    if (!usuario.id_usuario) return;
    if (!currPass) return toast.info("Ingresá tu contraseña actual (solo validación local)");
    if (!newPass) return toast.info("Ingresá la nueva contraseña");
    if (newPass !== newPass2) return toast.error("Las contraseñas nuevas no coinciden");
    if (newPass === currPass) return toast.error("La nueva debe ser distinta a la actual");
    try {
      setLoading(true);
      await axios.put(`${API}/usuarios/${usuario.id_usuario}`, { password: newPass });
      setCurrPass(""); setNewPass(""); setNewPass2("");
      toast.success("Contraseña actualizada ✅");
    } catch (e) {
      console.error(e);
      const apiMsg = e?.response?.data?.error || "No se pudo actualizar la contraseña";
      toast.error(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="as-modal" role="dialog" aria-modal="true">
      <div className="as-backdrop" onClick={onClose} />
      <aside className="as-panel" ref={panelRef}>
        <header className="as-head">
          <div className="as-title">
            <i className="fa-solid fa-gear" /> Ajustes de cuenta
          </div>
          <button className="as-close" onClick={onClose} aria-label="Cerrar">
            <i className="fa-solid fa-xmark" />
          </button>
        </header>

        <div className="as-tabs">
          <button className={`as-tab ${tab === "cuenta" ? "is-active" : ""}`} onClick={() => setTab("cuenta")}>Cuenta</button>
          <button className={`as-tab ${tab === "seguridad" ? "is-active" : ""}`} onClick={() => setTab("seguridad")}>Seguridad</button>
        </div>

        {tab === "cuenta" && (
          <div className="as-section">
            {/*Identidad en Perfil */}
            <div className="as-block">
              <div className="as-block__title">Identidad (Perfil)</div>
              <div className="as-grid">
                <div>
                  <label className="as-label">Nombre para mostrar</label>
                  <input
                    className="as-input"
                    value={perfil.display_name || ""}
                    onChange={(e) => setPerfil((p) => ({ ...p, display_name: e.target.value }))}
                    placeholder="Ej.: Lucas Frangolini"
                  />
                  <div className="as-hint">Se muestra en el perfil.</div>
                </div>
                <div>
                  <label className="as-label">Usuario @ (opcional)</label>
                  <input
                    className="as-input"
                    value={perfil.username || ""}
                    onChange={(e) => setPerfil((p) => ({ ...p, username: e.target.value.replace(/\s+/g, "") }))}
                    placeholder="Ej.: lucas.f"
                  />
                </div>
              </div>
              <div className="as-actions">
                <button className="as-btn" onClick={saveProfileIdentity} disabled={loading}>
                  <i className="fa-solid fa-floppy-disk" /> Guardar
                </button>
              </div>
            </div>

            {/* Datos (tabla usuario) */}
            <div className="as-block">
              <div className="as-block__title">Datos legales (Cuenta)</div>
              <div className="as-grid">
                <div>
                  <label className="as-label">Nombre legal</label>
                  <input
                    className="as-input"
                    value={tmpNombre}
                    onChange={(e) => setTmpNombre(e.target.value)}
                    placeholder="Tu nombre real"
                  />
                  <div className="as-actions">
                    <button className="as-btn as-btn--ghost" onClick={saveLegalName} disabled={loading}>
                      <i className="fa-solid fa-user-pen" /> Guardar nombre
                    </button>
                  </div>
                </div>

                <div>
                  <label className="as-label">Email</label>
                  <input
                    className="as-input"
                    type="email"
                    value={tmpEmail}
                    onChange={(e) => setTmpEmail(e.target.value)}
                    placeholder="nuevo@email.com"
                  />
                  <div className="as-kv">
                    <span className="as-kv__label">Actual:</span>
                    <span className="as-kv__value">{usuario.email ? maskedEmail : "—"}</span>
                  </div>
                  <div className="as-actions">
                    <button className="as-btn as-btn--ghost" onClick={submitEmailChange} disabled={loading || !tmpEmail}>
                      <i className="fa-solid fa-envelope" /> Actualizar email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "seguridad" && (
          <div className="as-section">
            <div className="as-block">
              <div className="as-block__title">Cambiar contraseña</div>
              <div className="as-grid">
                <div>
                  <label className="as-label">Contraseña actual</label>
                  <input
                    className="as-input"
                    type="password"
                    value={currPass}
                    onChange={(e) => setCurrPass(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="as-label">Nueva contraseña</label>
                  <input
                    className="as-input"
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Al menos 8 caracteres"
                  />
                  <Strength value={passScore} />
                </div>
                <div>
                  <label className="as-label">Confirmar nueva contraseña</label>
                  <input
                    className="as-input"
                    type="password"
                    value={newPass2}
                    onChange={(e) => setNewPass2(e.target.value)}
                    placeholder="Repetí la nueva contraseña"
                  />
                </div>
              </div>
              <div className="as-actions">
                <button className="as-btn" onClick={submitPasswordChange} disabled={loading || !canChangePass}>
                  <i className="fa-solid fa-key" /> Actualizar contraseña
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
