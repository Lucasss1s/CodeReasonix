import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../config/supabase.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

      console.log("Usuario logeado:", dataBackend.usuario);
      console.log("Cliente ID:", dataBackend.id_cliente);

      setMensaje("Login exitoso ✅");

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
