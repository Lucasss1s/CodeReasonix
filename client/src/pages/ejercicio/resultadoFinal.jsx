// client/src/pages/ejercicio/resultadoFinal.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import "./resultadoFinal.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ResultadoFinal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resultado, setResultado] = useState(null);
    const [comparacion, setComparacion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAllCases, setShowAllCases] = useState(false);
    const [chartMode, setChartMode] = useState("tiempo");

    useEffect(() => {
        const fetchResultado = async () => {
            try {
                const res = await fetch(`http://localhost:5000/submit-final/${id}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setResultado(data);

                const resComp = await fetch(`http://localhost:5000/submit-final/comparacion/${data.id_ejercicio}`);
                if (resComp.ok) {
                    const comp = await resComp.json();
                    setComparacion(comp);
                }
            } catch (err) {
                console.error("Error cargando resultado final:", err);
                setError("No se pudo cargar el resultado final.");
            } finally {
                setLoading(false);
            }
        };
        fetchResultado();
    }, [id]);

    if (loading) return <div className="loading">Cargando resultado final...</div>;
    if (error)
        return (
            <div className="resultado-page">
                <div className="error-box"><strong>Error:</strong> {error}</div>
            </div>
        );

    const detalles = resultado.detalles || [];
    const firstFail = detalles.find(d => d.resultado !== "aceptado") ?? null;

    const tiempoMax = Math.max(...detalles.map(d => d.tiempo || 0), 0);
    const memoriaMax = Math.max(...detalles.map(d => d.memoria || 0), 0);

    // Datos para el grafic
    const chartData = comparacion
        ? {
            labels: ["Mejor", "Promedio", "Tú"],
            datasets: [
                {
                    label: chartMode === "tiempo" ? "Tiempo (s)" : "Memoria (KB)",
                    data:
                        chartMode === "tiempo"
                            ? [comparacion.mejorTiempo, comparacion.promedioTiempo, tiempoMax]
                            : [comparacion.mejorMemoria, comparacion.promedioMemoria, memoriaMax],
                    backgroundColor: ["#42a5f5", "#888", "#4caf50"],
                    borderRadius: 8,
                },
            ],
        }
        : null;

    return (
        <div className="resultado-page">
            {/* HEADER */}
            <motion.div
                className="resultado-header"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <h2>Resultado Final</h2>
                <span className={`estado-badge ${resultado.resultado ? "ok" : "error"}`}>
                    {resultado.resultado ? "ACEPTADO" : "RECHAZADO"}
                </span>
                <div className="meta-row">
                    <span><strong>Lenguaje:</strong> {resultado.lenguaje}</span>
                </div>
            </motion.div>

            {/* METRICAS */}
            <div className="metricas">
                <motion.div className="card-metrica" whileHover={{ scale: 1.05 }}>
                    <h4>⏱️ Tiempo máx</h4>
                    <p>{tiempoMax}s</p>
                </motion.div>
                <motion.div className="card-metrica" whileHover={{ scale: 1.05 }}>
                    <h4>💾 Memoria máx</h4>
                    <p>{memoriaMax} KB</p>
                </motion.div>
                <motion.div className="card-metrica" whileHover={{ scale: 1.05 }}>
                    <h4>📊 Casos totales</h4>
                    <p>{detalles.length}</p>
                </motion.div>
            </div>

            {/* GRAFICO COMPARATIVO */}
            {comparacion && (
                <div className="chart-container">
                    <div className="chart-tabs">
                        <button
                            className={chartMode === "tiempo" ? "active" : ""}
                            onClick={() => setChartMode("tiempo")}
                        >
                            Velocidad
                        </button>
                        <button
                            className={chartMode === "memoria" ? "active" : ""}
                            onClick={() => setChartMode("memoria")}
                        >
                            Memoria
                        </button>
                    </div>
                    <Bar
                        data={chartData}
                        options={{
                            indexAxis: "y",
                            responsive: true,
                            plugins: { legend: { display: false } },
                            scales: {
                                x: {
                                    grid: { color: "#444" },
                                    ticks: { color: "#ddd" },
                                },
                                y: {
                                    ticks: { color: "#ddd" },
                                },
                            },
                        }}
                    />
                </div>
            )}

            {/* CODIGO */}
            <div className="codigo-container">
                <h3>Tu código</h3>
                <pre>{resultado.codigo_fuente}</pre>
                <button className="btn-copy">📋 Copiar</button>
            </div>

            {/* CASOS */}
            <div className="detalles-container">
                {firstFail ? (
                    <motion.div className="panel-fallo" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h4>Primer caso fallido ❌</h4>
                        <p><strong>Entrada:</strong> {firstFail.entrada[resultado.lenguaje]}</p>
                        <p><strong>Esperado:</strong> {firstFail.salida_esperada}</p>
                        <p><strong>Obtenido:</strong> {firstFail.salida_obtenida}</p>
                        <button className="btn-ghost" onClick={() => setShowAllCases(true)}>Ver todos</button>
                    </motion.div>
                ) : (
                    <motion.div className="panel-exito" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h4>✅ Todos los casos pasaron</h4>
                        <button className="btn-ghost" onClick={() => setShowAllCases(true)}>Ver detalles</button>
                    </motion.div>
                )}

                {showAllCases && (
                    <motion.div className="tabla-completa" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Entrada</th>
                                    <th>Esperado</th>
                                    <th>Obtenido</th>
                                    <th>Resultado</th>
                                    <th>Tiempo</th>
                                    <th>Memoria</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalles.map((caso, i) => (
                                    <tr key={i} className={caso.resultado === "aceptado" ? "ok" : "error"}>
                                        <td>{caso.entrada[resultado.lenguaje]}</td>
                                        <td>{caso.salida_esperada}</td>
                                        <td>{caso.salida_obtenida}</td>
                                        <td>{caso.resultado}</td>
                                        <td>{caso.tiempo}s</td>
                                        <td>{caso.memoria} KB</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </div>

            <div className="acciones">
                <button className="btn-volver" onClick={() => navigate(-1)}>← Volver al ejercicio</button>
            </div>
        </div>
    );
}

export default ResultadoFinal;
