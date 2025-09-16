import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../config/supabase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1️⃣ Iniciar sesión con Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2️⃣ Si todo salió bien, data.user tiene el usuario logeado
      console.log("Usuario logeado:", data.user);

      setMensaje("Login exitoso ✅");

      // 3️⃣ Redirigir al index después de 1s
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      console.error(err);
      setMensaje(err.message || "Error al iniciar sesión ❌");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>Iniciar Sesión</h2>
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "300px",
          margin: "0 auto",
        }}
      >
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
          Iniciar Sesión
        </button>
      </form>
      {mensaje && <p>{mensaje}</p>}
    </div>
  );
}
