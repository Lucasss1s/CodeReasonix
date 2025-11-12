import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../config/supabase.js";
import { toast } from "sonner";
import "./auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    let rewardState = null;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const res = await fetch("http://localhost:5000/usuarios/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error(`Error al traer cliente: ${res.status}`);
      const dataBackend = await res.json();

      if (!dataBackend.id_cliente) {
        setMensaje("Error: no se encontró cliente asociado a este usuario.");
        return;
      }

      localStorage.setItem("usuario", JSON.stringify(dataBackend.usuario));
      localStorage.setItem("cliente", dataBackend.id_cliente);

      try {
        const resXp = await fetch("http://localhost:5000/gamificacion/login-xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_cliente: dataBackend.id_cliente }),
        });
        const xpData = await resXp.json();

        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`login_xp_last:${dataBackend.id_cliente}`, today);

        if (resXp.ok) {
          if (xpData.otorgado) {
            const a = xpData?.reward_login?.amount || 0;
            const b = xpData?.reward_streak?.amount || 0;
            const total = a + b;

            if (total > 0) {
              rewardState = { amount: total, icon: b > 0 ? "🔥" : "💎" };
            }

            if (Array.isArray(xpData?.nuevosLogros) && xpData.nuevosLogros.length) {
              xpData.nuevosLogros.forEach(l => {
                toast.success(`¡Logro desbloqueado! ${l.icono} ${l.titulo} ${l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""}`);
              });
            }
          } else {
            console.log("ya tenia xp de login hoy, no se otorga");
          }
        } else {
          console.warn("no se pudo otorgar xp de login:", xpData?.error);
        }
      } catch (e) {
        console.warn("Error llamando /gamificacion/login-xp", e);
      }

      setMensaje("Login exitoso ✅");
      navigate("/", { replace: true, state: rewardState ? { reward: rewardState } : {} });
    } catch (err) {
      console.error(err);
      setMensaje(err.message || "Error al iniciar sesión ❌");
      toast.error("Error al iniciar sesión");
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
          <button type="submit" className="auth-button">Iniciar Sesión</button>
        </form>

        {mensaje && <p className="auth-message">{mensaje}</p>}

        <div className="auth-secondary">
          ¿No tenés cuenta? <Link to="/register">Registrate</Link>
        </div>
      </div>
    </div>
  );
}
