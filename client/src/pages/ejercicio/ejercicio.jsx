import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "./ejercicio.css";

function Ejercicio() {
    const { id } = useParams();
    const [ejercicio, setEjercicio] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [lenguaje, setLenguaje] = useState("python");
    const [resultados, setResultados] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    //ejercicio + plantilla formateada
    useEffect(() => {
        const fetchEjercicio = async () => {
        try {
            const res = await fetch(`http://localhost:5000/ejercicios/${id}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setEjercicio(data);

            //Plantilla lenguaje actual + formateo \n y \t
            const plantilla = data.plantillas?.[lenguaje];
            if (plantilla) {
            const formatted = plantilla
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "    ");
            setCodigo(formatted);
            } else {
            setCodigo(""); 
            }
        } catch (err) {
            console.error("Error cargando ejercicio:", err);
            setError("Error cargando ejercicio. Revisa la consola.");
        }
        };

        fetchEjercicio();
    }, [id, lenguaje]);

    const handleSubmit = async () => {
        if (!ejercicio) return;
        setLoading(true);
        setError(null);
        setResultados([]);
        setResumen(null);

        const body = {
        id_cliente: 1, // temporal
        id_ejercicio: ejercicio.id_ejercicio,
        codigo_fuente: codigo,
        lenguaje,
        };

        try {
        const res = await fetch("http://localhost:5000/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const detalles = data.detalles || [];
        setResultados(detalles);

        // resumen
        const tot = detalles.length;
        const ok = detalles.filter((d) => d.resultado === "aceptado").length;
        setResumen({
            resultado: data.resultado || (ok === tot && tot > 0 ? "aceptado" : "rechazado"),
            aceptados: ok,
            totales: tot,
            fecha: new Date().toLocaleString(),
        });
        } catch (err) {
        console.error("Error en submit:", err);
        setError(err.message || "Error al enviar el código.");
        } finally {
        setLoading(false);
        }
    };

    const monacoLanguageMap = {
        python: "python",
        javascript: "javascript",
        java: "java",
    };

    if (error && !ejercicio)
        return (
        <div className="ejercicio-page">
            <div style={{ padding: 20 }}>
            <h3>Error</h3>
            <pre>{error}</pre>
            </div>
        </div>
        );

    if (!ejercicio) return <div className="loading">Cargando...</div>;

    return (
        <div className="ejercicio-page">
        {/* LEFT */}
        <div className="left-panel">
            <div className="ejercicio-header">
            <h2>{ejercicio.titulo}</h2>
            <p className="descripcion">{ejercicio.descripcion}</p>
            <p className="dificultad">
                Dificultad:{" "}
                {ejercicio.dificultad === 1
                ? "Fácil"
                : ejercicio.dificultad === 2
                ? "Medio"
                : ejercicio.dificultad == 3
                ? "Difícil"
                : "Muy dificil"}
            </p>
            </div>

            <div className="casos-container">
            <h3>Casos de prueba:</h3>
            {ejercicio.casos_prueba.length === 0 && <p>No hay casos visibles.</p>}
            {ejercicio.casos_prueba.map((caso) => {
                return (
                <div key={caso.id_caso} className="caso">
                    <p>
                    <strong>Entrada:</strong>
                    </p>
                    <pre>
                    {caso.entrada_procesada?.[lenguaje] ??
                        JSON.stringify(caso.entrada_procesada ?? caso.entrada)}
                    </pre>
                    <p>
                    <strong>Salida esperada:</strong> {caso.salida_esperada}
                    </p>
                </div>
                );
            })}
            </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel">
            <div className="editor-container">
            <div className="editor-header">
                <div>
                <label htmlFor="lenguaje">Lenguaje:</label>{" "}
                <select
                    value={lenguaje}
                    onChange={(e) => setLenguaje(e.target.value)}
                    disabled={loading}
                >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                </select>
                </div>

                <button
                className="btn-submit"
                onClick={handleSubmit}
                disabled={loading}
                >
                {loading ? "Ejecutando..." : "Enviar"}
                </button>
            </div>

            <Editor
                height="420px"
                theme="vs-dark"
                language={monacoLanguageMap[lenguaje]}
                value={codigo}
                onChange={(value) => setCodigo(value ?? "")}
                options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                }}
            />
            </div>

            <div className="resultados-container">
            <h3>Resultados</h3>

            {resumen && (
                <div
                className={
                    resumen.resultado === "aceptado" ? "resumen-ok" : "resumen-error"
                }
                >
                <p>
                    <strong>{resumen.aceptados}/{resumen.totales}</strong> casos aceptados
                </p>
                <p>
                    <strong>Estado:</strong> {resumen.resultado.toUpperCase()}
                </p>
                </div>
            )}

            {error && (
                <div className="error-box">
                <strong>Error:</strong> <span>{error}</span>
                </div>
            )}

            {resultados.length === 0 ? (
                <p className="hint">Ejecuta tu código para ver los resultados...</p>
            ) : (
                <table>
                <thead>
                    <tr>
                    <th>#</th>
                    <th>Entrada</th>
                    <th>Esperado</th>
                    <th>Obtenido</th>
                    <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {resultados.map((r) => (
                    <tr
                        key={r.id_caso}
                        className={r.resultado === "aceptado" ? "resultado-ok" : "resultado-error"}
                    >
                        <td>{r.id_caso}</td>
                        <td>
                        <pre style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>
                            {r.entrada?.[lenguaje] ??
                            JSON.stringify(r.entrada ?? "", null, 2)}
                        </pre>
                        </td>
                        <td>{r.salida_esperada}</td>
                        <td style={{ whiteSpace: "pre-wrap" }}>{r.salida_obtenida}</td>
                        <td>{r.resultado}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
            </div>
        </div>
        </div>
    );
}

export default Ejercicio;
