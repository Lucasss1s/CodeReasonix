import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import useSesion from "../../hooks/useSesion";
import API_BASE from "../../config/api";
import "./formPreferencias.css";

export default function OnboardingPreferencias() {
  const [lenguaje, setLenguaje] = useState("python");
  const [nivel, setNivel] = useState(1);
  const [modo, setModo] = useState("fundamentos");
  const [tiempo, setTiempo] = useState(20);
  const [loading, setLoading] = useState(false);

  const { clienteId, cargandoSesion } = useSesion({ redirectToLogin: true });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!clienteId) {
      toast.error("No se encontró la sesión. Volvé a iniciar sesión.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API_BASE}/preferencias`, {
        id_cliente: Number(clienteId),
        lenguaje_pref: lenguaje,
        dificultad_objetivo: Number(nivel),
        modo_objetivo: modo,
        tiempo_sesion_minutos: Number(tiempo),
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("crx_pref_lenguaje", lenguaje);
        window.localStorage.setItem("crx_pref_dificultad", String(nivel));
      }

      toast.success("Preferencias guardadas. ¡Vamos a recomendarte ejercicios!");
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron guardar tus preferencias.");
    } finally {
      setLoading(false);
    }
  };

  if (cargandoSesion || !clienteId) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-card">
          <p className="onboarding-subtitle">Verificando sesion...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <h2 className="onboarding-title">Personalicemos tus recomendaciones</h2>
        <p className="onboarding-subtitle">
          Esto nos ayuda a sugerirte desafíos acordes a tu nivel y objetivos.
        </p>

        <form onSubmit={handleSubmit} className="onboarding-form">

          <div className="onboarding-field">
            <label>¿Con qué lenguaje querés practicar principalmente?</label>
            <select
              value={lenguaje}
              onChange={(e) => setLenguaje(e.target.value)}
            >
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>

          <div className="onboarding-field">
            <label>¿Cómo te considerás hoy?</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(Number(e.target.value))}
            >
              <option value={1}>Principiante total (Dificultad 1)</option>
              <option value={2}>Intermedio (Dificultad 2)</option>
              <option value={3}>Avanzado (Dificultad 3)</option>
              <option value={4}>Experto / Entrevistas fuertes (Dificultad 4)</option>
            </select>
          </div>

          <div className="onboarding-field">
            <label>¿Qué te interesa más ahora?</label>
            <select value={modo} onChange={(e) => setModo(e.target.value)}>
              <option value="fundamentos">Fundamentos y bases sólidas</option>
              <option value="estructuras_datos">
                Estructuras de datos y práctica técnica
              </option>
              <option value="entrevista">
                Preparación para entrevistas técnicas
              </option>
            </select>
          </div>

          <div className="onboarding-field">
            <label>¿Cuánto tiempo querés dedicar por sesión?</label>
            <select
              value={tiempo}
              onChange={(e) => setTiempo(Number(e.target.value))}
            >
              <option value={15}>10–15 minutos</option>
              <option value={25}>20–30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>1 hora o más</option>
            </select>
          </div>

          <button type="submit" className="onboarding-button" disabled={loading}>
            {loading ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
