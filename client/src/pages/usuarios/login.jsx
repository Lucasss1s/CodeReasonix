import { useState, useEffect } from "react";
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

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) return;

      try {
        localStorage.setItem("access_token", session.access_token);
        localStorage.setItem("refresh_token", session.refresh_token);
        localStorage.setItem("expires_at", session.expires_at);

        const res = await fetch(`${API_BASE}/auth/oauth`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.status === 403) {
          const dataError = await res.json();
          await supabase.auth.signOut();
          toast.error(dataError?.error || "Cuenta suspendida");
          return;
        }

        if (!res.ok) {
          toast.error("Error iniciando sesión con Google");
          return;
        }

        const dataBackend = await res.json();

        localStorage.setItem("usuario", JSON.stringify(dataBackend.usuario));
        localStorage.setItem("es_admin", dataBackend.es_admin ? "true" : "false");

        if (dataBackend.id_cliente) {
          localStorage.setItem("cliente", dataBackend.id_cliente);
        }

        navigate("/", { replace: true });

      } catch (err) {
        console.error(err);
        toast.error("Error iniciando sesion con Google");
      }
    };

    handleOAuthCallback();
  }, [navigate]);


  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");

    try {
      const { data: sessionData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message?.toLowerCase() || "";

        if (msg.includes("email not confirmed") || msg.includes("confirmation")) {
          localStorage.setItem("pending_email", email);

          toast.info("Tenes que confirmar tu correo antes de iniciar sesión");
          navigate("/email-pendiente", { replace: true });
          return;
        }

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
        const dataError = await res.json();

        if (dataError?.error === "email_pendiente") {
          await supabase.auth.signOut();

          localStorage.setItem("pending_email", email);

          toast.info("Tenés que confirmar tu correo antes de iniciar sesión");
          navigate("/email-pendiente", { replace: true });

          return; 
        }

        const rawMsg = dataError?.error || dataError?.message || null;
        const msg = rawMsg
          ? translateError(rawMsg)
          : "Tu cuenta está baneada. Contactá con soporte.";

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

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/oauth/callback`
        }
      });

      if (error) {
        toast.error("Error iniciando sesion con Google");
        console.error(error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Error iniciando sesion con Google");
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

          <div className="auth-divider">o</div>
          
          <button type="button"  className="gsi-material-button" onClick={handleGoogleLogin}>
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Continuar con Google</span>
              <span style={{ display: "none" }}>CContinuar con Google</span>
            </div>
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
