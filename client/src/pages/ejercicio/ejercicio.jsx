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

    useEffect(() => {
        const fetchEjercicio = async () => {
        try {
            const res = await fetch(`http://localhost:5000/ejercicios/${id}`);
            const data = await res.json();

            setEjercicio(data);

            if (data.plantillas && data.plantillas[lenguaje]) {
            const formatted = data.plantillas[lenguaje]
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "    ");
            setCodigo(formatted);
            }
        } catch (err) {
            console.error("Error cargando ejercicio:", err);
        }
        };
        fetchEjercicio();
    }, [id, lenguaje]);

    const handleSubmit = async () => {
        try {
        const res = await fetch("http://localhost:5000/submits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            id_ejercicio: ejercicio.id_ejercicio,
            lenguaje,
            codigo,
            }),
        });

        const data = await res.json();
        setResultados(data.detalles || []);
        } catch (err) {
        console.error("Error enviando solución:", err);
        }
    };

    //Mapeo de lenguajes backend -> Monaco
    const monacoLanguageMap = {
        python: "python",
        javascript: "javascript",
        java: "java",
    };

    if (!ejercicio) return <div className="loading">Cargando...</div>;

    return (
        <div className="ejercicio-page">
        {/* Columna izquierda */}
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
                : "Difícil"}
            </p>
            </div>

            <div className="casos-container">
            <h3>Casos de prueba</h3>
            {ejercicio.casos_prueba.map((caso) => (
                <div key={caso.id_caso} className="caso">
                <p>
                    <strong>Entrada:</strong>{" "}
                    <pre>{caso.entrada_procesada?.[lenguaje] || caso.entrada}</pre>
                </p>
                <p>
                    <strong>Salida esperada:</strong> {caso.salida_esperada}
                </p>

                {resultados.length > 0 && (
                    <p
                    className={
                        resultados.find((r) => r.id_caso === caso.id_caso)
                        ?.resultado === "OK"
                        ? "resultado-ok"
                        : "resultado-error"
                    }
                    >
                    {resultados.find((r) => r.id_caso === caso.id_caso)
                        ?.resultado || "Pendiente"}
                    </p>
                )}
                </div>
            ))}
            </div>
        </div>

        {/* Columna derecha */}
        <div className="right-panel">
            <div className="editor-container">
            <div className="editor-header">
                <label htmlFor="lenguaje">Lenguaje:</label>
                <select
                value={lenguaje}
                onChange={(e) => setLenguaje(e.target.value)}
                >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                </select>
            </div>

            {/* Monaco reemplaza textarea */}
            <Editor
                height="400px"
                theme="vs-dark"
                language={monacoLanguageMap[lenguaje]}
                value={codigo}
                onChange={(value) => setCodigo(value || "")}
                options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                }}
            />

            <button className="btn-submit" onClick={handleSubmit}>
                Enviar
            </button>
            </div>

            <div className="resultados-container">
            <h3>Resultados</h3>
            {resultados.length === 0 ? (
                <p className="hint">Ejecuta tu código para ver los resultados...</p>
            ) : (
                <table>
                <thead>
                    <tr>
                    <th>Caso</th>
                    <th>Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {resultados.map((r, idx) => (
                    <tr
                        key={idx}
                        className={
                        r.resultado === "OK" ? "resultado-ok" : "resultado-error"
                        }
                    >
                        <td>{r.id_caso}</td>
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
