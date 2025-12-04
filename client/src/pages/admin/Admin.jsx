import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar.jsx";
import "./admin.css";

export default function Admin() {
  const navigate = useNavigate();

  useEffect(() => {
    const rawFlag = localStorage.getItem("es_admin");
    const esAdmin = rawFlag === "true" || rawFlag === "1";
    if (!esAdmin) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  return (
    <>
      <Navbar />
      <div className="admin-page">
        <header className="admin-header">
          <h2 className="admin-title">Panel de administración</h2>
          <p className="admin-subtitle">
            Elegí qué sección del panel querés gestionar.
          </p>
        </header>

        <section className="admin-card admin-menu-grid">
          <button
            type="button"
            className="admin-menu-button"
            onClick={() => navigate("/adminusuarios")}
          >
            <span className="admin-menu-title">Usuarios</span>
            <span className="admin-menu-text">
              Ver, activar y banear cuentas de usuarios.
            </span>
          </button>

          <button
            type="button"
            className="admin-menu-button"
            onClick={() => navigate("/admindesafios")}
          >
            <span className="admin-menu-title">Desafíos</span>
            <span className="admin-menu-text">
              Crear desafíos, preguntas y asignarlas por lenguaje/dificultad.
            </span>
          </button>

          <button
            type="button"
            className="admin-menu-button"
            onClick={() => navigate("/adminentrevistas")}
          >
            <span className="admin-menu-title">Ofertas laborales</span>
            <span className="admin-menu-text">
              Gestionar empresas, ofertas laborales y postulaciones de
              candidatos.
            </span>
          </button>
        </section>
      </div>
    </>
  );
}
