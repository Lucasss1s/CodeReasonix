import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!password || !confirmPassword) {
      setMensaje("Completá ambos campos de contraseña.");
      toast.error("Completá ambos campos de contraseña.");
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

      const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
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
          const a = xpData?.reward_login?.amount || 0;
          const b = xpData?.reward_streak?.amount || 0;
          const total = a + b;
          if (total > 0) {
            rewardState = { amount: total, icon: b > 0 ? "🔥" : "💎" };
          }
          if (Array.isArray(xpData?.nuevosLogros) && xpData.nuevosLogros.length) {
            xpData.nuevosLogros.forEach((l) => {
              toast.success(
                `¡Logro desbloqueado! ${l.icono} ${l.titulo} ${l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""}`
              );
            });
          }
        }
      } catch (e) {
        console.warn("Error llamando /gamificacion/login-xp desde register:", e);
      }

      setMensaje("Usuario registrado y logeado correctamente ✅");
      navigate("/", { replace: true, state: rewardState ? { reward: rewardState } : {} });
    } catch (err) {
      console.error(err);
      setMensaje(err.response?.data?.error || err.message || "Error al registrar usuario ❌");
      toast.error("Error al registrar usuario");
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
      </div>
    </div>
  );
}
