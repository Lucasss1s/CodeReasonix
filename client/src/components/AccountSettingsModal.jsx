import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import API_BASE from "../config/api";
import { supabase } from "../config/supabase.js";
import { authFetch } from "../utils/authToken";
import "./account-settings.css";


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
  const navigate = useNavigate();

  // usuario 
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

  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const passScore = scorePassword(newPass);

  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || !id_cliente) return;
    (async () => {
      setLoading(true);
      try {
        //usuario de cliente
        const u = await authFetch(`${API_BASE}/usuarios/by-cliente/${id_cliente}`);
        const user = await u.json();
        setUsuario({
          id_usuario: user.id_usuario,
          nombre: user.nombre || "",
          email: user.email || "",
        });
        setTmpNombre(user.nombre || "");

        //perfil
        const res = await authFetch(`${API_BASE}/perfil`);
        const data = await res.json();
        setPerfil({
          display_name: data.display_name || "",
          username: data.username || "",
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

//Guardar identidad perfil (display_name y username)
const saveProfileIdentity = async () => {
  const payload = {
    display_name: (perfil.display_name || "").trim() || null,
    username: (perfil.username || "").trim() || null,
  };
  try {
    setLoading(true);
    await authFetch(`${API_BASE}/perfil`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
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


  //Guardar nombre 
  const saveLegalName = async () => {
    if (!usuario.id_usuario) return;
    const name = (tmpNombre || "").trim();
    if (!name) return toast.info("Ingresá un nombre");
    try {
      setLoading(true);
      await authFetch(`${API_BASE}/usuarios/${usuario.id_usuario}`,{ 
        method: "PUT", 
        body: JSON.stringify({ nombre: name }) 
      });
      setUsuario((u) => ({ ...u, nombre: name }));
      toast.success("Nombre actualizado");
      onIdentityUpdated?.({ nombre: name }); 
    } catch (e) {
      console.error(e);
      const apiMsg = e?.response?.data?.error || "No se pudo actualizar el nombre";
      toast.error(apiMsg);
    } finally {
      setLoading(false);
    }
  };

  // Cambiar contraseña
  const submitPasswordChange = async () => {
    if (!usuario.id_usuario) return;

    if (!currPass) return toast.info("Ingresá tu contraseña actual");
    if (!newPass) return toast.info("Ingresá la nueva contraseña");
    if (newPass !== newPass2) return toast.error("Las contraseñas nuevas no coinciden");
    if (newPass.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (newPass === currPass) return toast.error("La nueva debe ser distinta a la actual");

    try {
      setLoading(true);

      const res = await authFetch(`${API_BASE}/usuarios/password`, {
        method: "PUT",
        body: JSON.stringify({ currPass, newPass }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error actualizando contraseña");
      }

      setCurrPass("");
      setNewPass("");
      setNewPass2("");

      toast.success("Contraseña actualizada. Volvé a iniciar sesión.");

      setTimeout(async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        navigate("/login", { replace: true });
      }, 1500);

    } catch (e) {
      console.error(e);
      const apiMsg =
        e?.response?.data?.error ||
        e?.message ||
        "No se pudo actualizar la contraseña";

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
                    placeholder="Ej.: Jr Juan"
                  />
                  <div className="as-hint">Se muestra en el perfil.</div>
                </div>
                <div>
                  <label className="as-label">Usuario @ (opcional)</label>
                  <input
                    className="as-input"
                    value={perfil.username || ""}
                    onChange={(e) => setPerfil((p) => ({ ...p, username: e.target.value.replace(/\s+/g, "") }))}
                    placeholder="Ej.: juan.js"
                  />
                </div>
              </div>
              <div className="as-actions">
                <button className="as-btn" onClick={saveProfileIdentity} disabled={loading}>
                  <i className="fa-solid fa-floppy-disk" /> Guardar
                </button>
              </div>
            </div>

            {/* Datos */}
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
                  <label className="as-label" required>Contraseña actual</label>
                  <input
                    className="as-input"
                    type="password"
                    value={currPass}
                    onChange={(e) => setCurrPass(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="as-label" required>Nueva contraseña</label>
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
                  <label className="as-label" required>Confirmar nueva contraseña</label>
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
                <button className="as-btn" onClick={submitPasswordChange} disabled={loading}>
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
