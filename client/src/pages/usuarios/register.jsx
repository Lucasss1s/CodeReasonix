import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { supabase } from "../../config/supabase.js";

export default function Register() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
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

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginError) throw loginError;

      localStorage.setItem("usuario", JSON.stringify(res.data.usuario));
      localStorage.setItem("cliente", res.data.cliente.id_cliente);

      setMensaje("Usuario registrado y logeado correctamente ✅");

      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      console.error(err);
      setMensaje(err.response?.data?.error || err.message || "Error al registrar usuario ❌");
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
