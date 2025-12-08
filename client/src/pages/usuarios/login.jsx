import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../config/supabase.js";
import API_BASE from "../../config/api";
import { toast } from "sonner";
import "./auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const translateError = (raw) => {
    if (!raw) return "Error al iniciar sesión. Intenta nuevamente.";
    const s = String(raw).toLowerCase();

    if (s.includes("invalid login credentials") || s.includes("invalid login") || s.includes("invalid password") || s.includes("invalid email") || s.includes("invalid credentials")) {
      return "Credenciales inválidas";
    }
    if (s.includes("user not found") || s.includes("no existe") || s.includes("not found")) {
      return "Usuario no encontrado";
    }
    if (s.includes("email not confirmed") || s.includes("confirmation")) {
      return "Correo no confirmado";
    }
    if (s.includes("invalid or expired refresh token") || s.includes("expired")) {
      return "Sesión vencida o inválida. Volvé a iniciar sesión";
    }
    if (s.includes("rate limit") || s.includes("too many requests")) {
      return "Demasiados intentos. Esperá un momento e intentá de nuevo.";
    }
    if (raw.length < 150) return String(raw);
    return "Error al iniciar sesión. Intenta nuevamente más tarde.";
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setMensaje("");

      const { data: sessionData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const friendly = translateError(error.message || error.error || String(error));
        toast.error(friendly);
        return;
      }

      if (sessionData?.session) {
        localStorage.setItem("access_token", sessionData.session.access_token);
        localStorage.setItem("refresh_token", sessionData.session.refresh_token);
        localStorage.setItem("expires_at", sessionData.session.expires_at);
      }

      const res = await fetch(`${API_BASE}/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 403) {
        let dataError = null;
        try {
          dataError = await res.json();
        // eslint-disable-next-line
        } catch (_) {}
        const rawMsg = dataError?.error || dataError?.message || null;
        const msg = rawMsg ? translateError(rawMsg) : "Tu cuenta está baneada. Contactá con soporte.";
        await supabase.auth.signOut();

        localStorage.removeItem("usuario");
        localStorage.removeItem("cliente");
        localStorage.removeItem("es_admin");

        toast.error(msg);
        return;
      }

      if (!res.ok) {
        let dataError = null;
        try {
          dataError = await res.json();
        // eslint-disable-next-line
        } catch (_) {}
        const rawMsg = dataError?.error || dataError?.message || `Error del servidor: ${res.status}`;
        const friendly = translateError(rawMsg);
        toast.error(friendly);
        return;
      }

      const dataBackend = await res.json();

      const esAdmin = !!dataBackend.es_admin;
      localStorage.setItem("es_admin", esAdmin ? "true" : "false");

      if (!dataBackend.id_cliente && !esAdmin) {
        const msg = "No se encontró cliente asociado a este usuario.";
        toast.error(msg);
        return;
      }

      localStorage.setItem("usuario", JSON.stringify(dataBackend.usuario || {}));

      if (dataBackend.id_cliente) {
        localStorage.setItem("cliente", dataBackend.id_cliente);
      }

      if (dataBackend.id_cliente) {
        try {
          const resXp = await fetch(`${API_BASE}/gamificacion/login-xp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_cliente: dataBackend.id_cliente }),
          });
          const xpData = await resXp.json();

          const today = new Date().toISOString().slice(0, 10);
          localStorage.setItem(`login_xp_last:${dataBackend.id_cliente}`, today);

          if (resXp.ok && xpData.otorgado) {
            const a = xpData?.reward_login?.amount || 0;
            const b = xpData?.reward_streak?.amount || 0;
            const total = a + b;
            if (total > 0) {
              const icon = b > 0 ? "🔥" : "💎";
              toast.success(`Ganaste ${total} XP ${icon}`);
            }

            if (Array.isArray(xpData?.nuevosLogros) && xpData.nuevosLogros.length) {
              xpData.nuevosLogros.forEach((l) => {
                toast.success(`¡Logro desbloqueado! ${l.icono} ${l.titulo} ${l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""}`);
              });
            }
          } else if (!resXp.ok) {
            console.warn("No se pudo otorgar XP de login:", xpData?.error);
          }
        } catch (e) {
          console.warn("Error llamando /gamificacion/login-xp", e);
        }
      }

      setMensaje("Login exitoso ✅");
      navigate("/", {
        replace: true,
        state: {},
      });
    } catch (err) {
      console.error(err);
      const raw = err?.message || err?.toString() || null;
      const friendly = translateError(raw);
      toast.error(friendly);
      setMensaje("");
      localStorage.removeItem("es_admin");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Iniciar Sesión</h2>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
          />
          <button type="submit" className="auth-button">
            Iniciar Sesión
          </button>
        </form>

        {mensaje && <p className="auth-message">{mensaje}</p>}

        <div className="auth-secondary">
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </div>
      </div>
    </div>
  );
}
