import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import useAuth from "../../hooks/useAuth";
import confetti from "canvas-confetti";
import "./ejercicio.css";

function Ejercicio() {
    const { clienteId } = useAuth({ redirectToLogin: true });

    const { id } = useParams();
    const navigate = useNavigate();
    const [ejercicio, setEjercicio] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [lenguaje, setLenguaje] = useState("python");
    const [resultados, setResultados] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingFinal, setLoadingFinal] = useState(false);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [leftWidth, setLeftWidth] = useState(40);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const [editorHeight, setEditorHeight] = useState(70);
    const isDraggingVertical = useRef(false);

    // Cargar ejercicio 
    useEffect(() => {
        const fetchEjercicio = async () => {
            try {
                const res = await fetch(`http://localhost:5000/ejercicios/${id}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setEjercicio(data);
            } catch (err) {
                console.error("Error cargando ejercicio:", err);
                setError("Error cargando ejercicio. Revisa la consola.");
            }
        };
        fetchEjercicio();
    }, [id]);

    // -------- Cargar código guardado --------
    useEffect(() => {
        const fetchCodigoGuardado = async () => {
            if (!clienteId || !ejercicio) return;
            try {
                const res = await fetch(
                    `http://localhost:5000/codigoGuardado/${clienteId}/${ejercicio.id_ejercicio}/${lenguaje}`
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                if (data.codigo) {
                    setCodigo(data.codigo);
                } else {
                    const plantilla = ejercicio.plantillas?.[lenguaje];
                    setCodigo(
                        plantilla
                            ? plantilla.replace(/\\n/g, "\n").replace(/\\t/g, "    ")
                            : ""
                    );
                }
            } catch (err) {
                console.error("Error cargando código guardado:", err);
            }
        };
        fetchCodigoGuardado();
    }, [clienteId, ejercicio, lenguaje]);

    // -------- Guardado automático --------
    useEffect(() => {
        if (!clienteId || !ejercicio) return;
        if (codigo === undefined) return;

        const timeout = setTimeout(async () => {
            setSaving(true);
            try {
                await fetch("http://localhost:5000/codigoGuardado", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id_cliente: clienteId,
                        id_ejercicio: ejercicio.id_ejercicio,
                        lenguaje,
                        codigo,
                    }),
                });
            } finally {
                setTimeout(() => setSaving(false), 700);
            }
        }, 700);

        return () => clearTimeout(timeout);
    }, [codigo, clienteId, ejercicio, lenguaje]);

    // -------- Drag horizontal (panel izquierdo) --------
    const startDrag = () => (isDragging.current = true);
    const stopDrag = () => (isDragging.current = false);
    const onDrag = (e) => {
        if (!isDragging.current || !containerRef.current) return;
        const bounds = containerRef.current.getBoundingClientRect();
        let newWidth = ((e.clientX - bounds.left) / bounds.width) * 100;
        newWidth = Math.max(25, Math.min(60, newWidth));
        setLeftWidth(newWidth);
    };

    // -------- Drag vertical (editor / resultados) --------
    const startVerticalDrag = () => (isDraggingVertical.current = true);
    const stopVerticalDrag = () => (isDraggingVertical.current = false);
    const onVerticalDrag = (e) => {
    if (!isDraggingVertical.current || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    let newHeight = ((e.clientY - bounds.top) / bounds.height) * 100;
    newHeight = Math.max(35, Math.min(90, newHeight));
    setEditorHeight(newHeight);
    };
    


    useEffect(() => {
        window.addEventListener("mousemove", onDrag);
        window.addEventListener("mouseup", stopDrag);
        window.addEventListener("mousemove", onVerticalDrag);
        window.addEventListener("mouseup", stopVerticalDrag);
        return () => {
            window.removeEventListener("mousemove", onDrag);
            window.removeEventListener("mouseup", stopDrag);
            window.removeEventListener("mousemove", onVerticalDrag);
            window.removeEventListener("mouseup", stopVerticalDrag);
        };
    }, []);

    const handleReset = async () => {
        if (!ejercicio) return;
        const plantilla = ejercicio.plantillas?.[lenguaje]
            ?.replace(/\\n/g, "\n")
            .replace(/\\t/g, "    ") || "";
        setCodigo(plantilla);

        await fetch("http://localhost:5000/codigoGuardado", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_cliente: clienteId,
                id_ejercicio: ejercicio.id_ejercicio,
                lenguaje,
                codigo: plantilla,
            }),
        });
    };

    const handleSubmit = async () => {
        if (!ejercicio || !clienteId) return;
        setLoadingSubmit(true);
        setError(null);
        setResultados([]);
        setResumen(null);

        try {
            const res = await fetch("http://localhost:5000/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_cliente: clienteId,
                    id_ejercicio: ejercicio.id_ejercicio,
                    codigo_fuente: codigo,
                    lenguaje,
                }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const detalles = data.detalles || [];
            setResultados(detalles);

            const tot = detalles.length;
            const ok = detalles.filter((d) => d.resultado === "aceptado").length;
            const nuevoResumen = {
                resultado: data.resultado || (ok === tot && tot > 0 ? "aceptado" : "rechazado"),
                aceptados: ok,
                totales: tot,
            };
            setResumen(nuevoResumen);

            if (nuevoResumen.resultado === "aceptado" && tot > 0) {
                confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
            }
        } catch (err) {
            console.error("Error en submit:", err);
            setError(err.message || "Error al enviar el código.");
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleFinalSubmit = async () => {
        setLoadingFinal(true);
        try {
            const res = await fetch("http://localhost:5000/submit-final", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_cliente: clienteId,
                    id_ejercicio: ejercicio.id_ejercicio,
                    codigo_fuente: codigo,
                    lenguaje,
                }),
            });
            const data = await res.json();
            navigate(`/resultado/${data.insert?.id_submit_final ?? ""}`);
        } catch (err) {
            console.error("Error en submit final:", err);
            setError(err.message || "Error al enviar el código final.");
        } finally {
            setLoadingFinal(false);
        }
    };

    if (!ejercicio) return <div className="loading">Cargando...</div>;

    return (
        <div className="ejercicio-page" ref={containerRef}>
            {/* PANEL IZQUIERDO */}
            <div className="left-panel" style={{ width: `${leftWidth}%` }}>
                <div className="ejercicio-header">
                    <h2>{ejercicio.titulo}</h2>
                    <p className="descripcion">{ejercicio.descripcion}</p>
                    <p className="dificultad">
                        Dificultad: {["Fácil", "Medio", "Difícil", "Muy Difícil"][ejercicio.dificultad - 1]}
                    </p>
                </div>
                <div className="casos-container">
                    <h3>Casos de prueba</h3>
                    {ejercicio.casos_prueba.length === 0 && <p>No hay casos visibles.</p>}
                    {ejercicio.casos_prueba.map((caso) => (
                        <div key={caso.id_caso} className="caso">
                            <p><strong>Entrada:</strong></p>
                            <pre>{caso.entrada_procesada?.[lenguaje] ?? JSON.stringify(caso.entrada)}</pre>
                            <p><strong>Salida esperada:</strong> {caso.salida_esperada}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="drag-handle" onMouseDown={startDrag}></div>

            {/* PANEL DERECHO */}
            <div className="right-panel">
                <div className="editor-resultados-wrapper">
                    <div className="editor-container" style={{ flexBasis: `${editorHeight}%` }}>
                        <div className="editor-header">
                            <div>
                                <label htmlFor="lenguaje">Lenguaje:</label>{" "}
                                <select value={lenguaje} onChange={(e) => setLenguaje(e.target.value)}>
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="java">Java</option>
                                </select>
                            </div>
                            <div className="submit-buttons">
                                <button className="btn-reset" onClick={handleReset}>↺ Reset</button>
                                <button className="btn-submit" onClick={handleSubmit}>{loadingSubmit ? "⏳" : "▶ Probar"}</button>
                                <button className="btn-final" onClick={handleFinalSubmit}>{loadingFinal ? "⏳" : "🚀 Entregar"}</button>
                            </div>
                        </div>

                        <Editor
                            key={editorHeight}
                            height="100%"
                            theme="vs-dark"
                            language={lenguaje}
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
                        <div className={`save-indicator ${saving ? "saving" : "saved"}`}>
                            {saving ? "💾 Guardando..." : "✅ Guardado"}
                        </div>
                    </div>

                    <div className="horizontal-drag-handle" onMouseDown={startVerticalDrag}></div>

                    <div className="resultados-container" style={{ flexBasis: `${100 - editorHeight}%` }}>
                        <h3>Resultados</h3>
                        {resumen ? (
                            <div className={resumen.resultado === "aceptado" ? "resumen-ok" : "resumen-error"}>
                                <p>
                                    <strong>{resumen.aceptados}/{resumen.totales}</strong> casos aceptados — 
                                    <strong> Estado:</strong> {resumen.resultado.toUpperCase()}
                                </p>
                            </div>
                        ) : (
                            <p className="hint">Ejecuta tu código para ver los resultados aquí.</p>
                        )}
                        {resultados.length > 0 && (
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
                                        <tr key={r.id_caso} className={r.resultado === "aceptado" ? "resultado-ok" : "resultado-error"}>
                                            <td>{r.id_caso}</td>
                                            <td><pre>{r.entrada?.[lenguaje] ?? JSON.stringify(r.entrada)}</pre></td>
                                            <td>{r.salida_esperada}</td>
                                            <td>{r.salida_obtenida}</td>
                                            <td>{r.resultado}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Ejercicio;
