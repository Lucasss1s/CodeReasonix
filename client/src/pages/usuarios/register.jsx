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

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);

      const { data: signupData, error: authError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

      if (authError) throw authError;

      const sesion_id = signupData?.user?.id;
      if (!sesion_id) throw new Error("No se pudo obtener el UUID de Supabase");

      await axios.post(`${API_BASE}/usuarios/register`, {
        nombre,
        email,
        password,
        sesion_id
      });

      localStorage.setItem("pending_email", email);
      navigate("/email-pendiente", { replace: true });

    } catch (err) {
      console.error(err);
        
      const raw = err?.response?.data?.error || err.message;
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

        <div className="auth-secondary">
          ¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
