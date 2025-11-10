import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../../config/supabase.js";
import { toast } from "sonner";

export default function Register() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    let rewardState = null;

    try {
      // eslint-disable-next-line
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw authError;

      const res = await axios.post("http://localhost:5000/usuarios/register", {
        nombre,
        email,
        password,
        estado: true,
      });

      const usuario = res.data.usuario;
      const id_cliente = res.data.cliente?.id_cliente;

      if (!id_cliente) {
        throw new Error("No se obtuvo id_cliente al registrar.");
      }
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;

      localStorage.setItem("usuario", JSON.stringify(usuario));
      localStorage.setItem("cliente", id_cliente);

      try {
        const resXp = await fetch("http://localhost:5000/gamificacion/login-xp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_cliente }),
        });
        const xpData = await resXp.json();

        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`login_xp_last:${id_cliente}`, today);

        if (resXp.ok) {
          if (xpData.otorgado) {
            const a = xpData?.reward_login?.amount || 0;
            const b = xpData?.reward_streak?.amount || 0;
            const total = a + b;

            if (total > 0) {
              rewardState = {
                amount: total,
                icon: b > 0 ? "🔥" : "💎",
              };
            }

            if (Array.isArray(xpData?.nuevosLogros) && xpData.nuevosLogros.length) {
              xpData.nuevosLogros.forEach((l) => {
                toast.success(
                  `¡Logro desbloqueado! ${l.icono} ${l.titulo} ${
                    l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""
                  }`
                );
              });
            }
          } else {
            console.log("Ya tenía XP de login hoy, no se otorga (register).");
          }
        } else {
          console.warn("No se pudo otorgar xp de login (register):", xpData?.error);
        }
      } catch (e) {
        console.warn("Error llamando /gamificacion/login-xp desde register:", e);
      }

      setMensaje("Usuario registrado y logeado correctamente ✅");

      navigate("/", {
        replace: true,
        state: rewardState ? { reward: rewardState } : {},
      });
    } catch (err) {
      console.error(err);
      setMensaje(
        err.response?.data?.error || err.message || "Error al registrar usuario ❌"
      );
      toast.error("Error al registrar usuario");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Registro de Usuario</h2>
      <form
        onSubmit={handleRegister}
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "300px",
          margin: "0 auto",
        }}
      >
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          style={{ margin: "10px 0", padding: "8px" }}
        />
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ margin: "10px 0", padding: "8px" }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ margin: "10px 0", padding: "8px" }}
        />
        <button type="submit" style={{ padding: "10px", cursor: "pointer" }}>
          Registrarse
        </button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}
