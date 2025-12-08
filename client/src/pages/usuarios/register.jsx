import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { supabase } from "../../config/supabase.js";
import API_BASE from "../../config/api";
import { toast } from "sonner";
import "./auth.css";

export default function Register() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); 
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const translateError = (raw) => {
    if (!raw) return "Error al registrar. Intentá nuevamente.";
    const s = String(raw).toLowerCase();

    if (s.includes("password") && s.includes("strength")) {
      return "La contraseña es muy débil. Usá al menos 6 caracteres";
    }
    if (s.includes("user already registered") || s.includes("email already exists") || s.includes("duplicat")) {
      return "Ya existe una cuenta con ese correo";
    }
    if (s.includes("invalid email") || s.includes("email format")) {
      return "El correo no tiene un formato válido";
    }
    if (s.includes("invalid") && s.includes("password")) {
      return "Contraseña inválida";
    }
    if (s.includes("too many requests")) {
      return "Demasiados intentos. Probá más tarde";
    }
    if (String(raw).length < 150) return String(raw);
    return "Error al registrar. Intentá nuevamente más tarde";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setMensaje("Las contraseñas no coinciden.");
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    let rewardState = null;

    try {
      setLoading(true);

      const { error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) throw authError;

      const res = await axios.post(`${API_BASE}/usuarios/register`, {
        nombre,
        email,
        password,
        estado: true,
      });

      const usuario = res.data.usuario;
      const id_cliente = res.data.cliente?.id_cliente;
      if (!id_cliente) throw new Error("No se obtuvo id_cliente al registrar.");

      const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;

      if (sessionData?.session) {
        localStorage.setItem("access_token", sessionData.session.access_token);
        localStorage.setItem("refresh_token", sessionData.session.refresh_token);
        localStorage.setItem("expires_at", sessionData.session.expires_at);
      }

      localStorage.setItem("usuario", JSON.stringify(usuario));
      localStorage.setItem("cliente", id_cliente);

      // XP de login diario
      try {
        const resXp = await fetch(`${API_BASE}/gamificacion/login-xp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_cliente }),
        });
        const xpData = await resXp.json();

        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`login_xp_last:${id_cliente}`, today);

        if (resXp.ok && xpData.otorgado) {
          const total = (xpData?.reward_login?.amount || 0) + (xpData?.reward_streak?.amount || 0);
          if (total > 0) rewardState = { amount: total, icon: "💎" };
        }
      } catch (e) {
        console.warn("Error XP register:", e);
      }

      setMensaje("Cuenta creada y sesión iniciada ✅");
      navigate("/", { replace: true, state: rewardState ? { reward: rewardState } : {} });
    } catch (err) {
      console.error(err);
      const raw = err?.response?.data?.error || err.message || String(err);
      toast.error(translateError(raw));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Registro de Usuario</h2>

        <form onSubmit={handleRegister} className="auth-form">
          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="auth-input"
          />
          <input
            type="email"
            placeholder="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}   
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
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="auth-input"
          />

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        {mensaje && <p className="auth-message">{mensaje}</p>}

        <div className="auth-secondary">
          ¿Tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
