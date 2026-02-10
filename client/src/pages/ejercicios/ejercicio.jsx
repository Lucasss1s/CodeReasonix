import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EjercicioComentarios from "../../components/EjercicioComentarios.jsx";
import Editor from "@monaco-editor/react";
import useRequirePreferencias from "../../hooks/useRequirePreferencias";
import API_BASE from "../../config/api";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import "./ejercicio.css";
import Navbar from "../../components/Navbar";
import EjercicioPistas from "../../components/EjercicioPistas.jsx";
import EjercicioHistorial from "../../components/EjercicioHistorial.jsx";
import EjercicioBugReport from "../../components/EjercicioBugReport.jsx";
import { getValidAccessToken, authFetch } from "../../utils/authToken";


function splitTemplatePorLenguaje(rawTemplate, lenguaje) {
    if (!rawTemplate) return { header: "", driver: "" };
    const template = rawTemplate
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "    ");
    const lines = template.split(/\r?\n/);

    //Java
    if (lenguaje === "java") {
        const idxMain = lines.findIndex((l) => l.includes("public static void main"));
        if (idxMain === -1) {
        return { header: template, driver: "" };
        }
        const idxMethod = lines.findIndex(
        (l, i) =>
            i < idxMain &&
            l.includes("public") &&
            l.includes("(") &&
            l.includes(")") &&
            !l.includes(" main(")
        );

        if (idxMethod === -1) {
        return {
            header: lines.slice(0, idxMain).join("\n"),
            driver: lines.slice(idxMain).join("\n"),
        };
        }

        const editableLines = lines.slice(idxMethod, idxMain);
        const nonEmpty = editableLines.filter((l) => l.trim().length > 0);
        let minIndent = 0;
        if (nonEmpty.length) {
        minIndent = Math.min(
            ...nonEmpty.map((l) => (l.match(/^\s*/)?.[0].length ?? 0))
        );
        }

        const dedented = editableLines
        .map((l) =>
            l.length >= minIndent ? l.slice(minIndent) : l
        )
        .join("\n")
        .trimEnd();

        return { header: dedented, driver: template };
    }

    //Python/Js
    let cut = lines.length;
    const idxEntrada = lines.findIndex((l) => l.includes("{entrada}"));
    if (idxEntrada !== -1) cut = idxEntrada;

    const header = lines.slice(0, cut).join("\n").trimEnd();
    const driver = lines.slice(cut).join("\n");

    return { header, driver };
}

function reconstructionCode(headerCode, rawTemplate, lenguaje) {
    if (!rawTemplate) return headerCode;

    const template = rawTemplate
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "    ");

    const lines = template.split(/\r?\n/);

    //Java
    if (lenguaje === "java") {
        const idxMain = lines.findIndex((l) => l.includes("public static void main"));
        if (idxMain === -1) {
        return headerCode;
        }
        const idxMethod = lines.findIndex(
        (l, i) =>
            i < idxMain &&
            l.includes("public") &&
            l.includes("(") &&
            l.includes(")") &&
            !l.includes(" main(")
        );

        if (idxMethod === -1) {
        return template;
        }

        const before = lines.slice(0, idxMethod).join("\n");
        const after = lines.slice(idxMain).join("\n");

        //Indentacion 
        const indentMatch = lines[idxMethod].match(/^\s*/);
        const indent = indentMatch ? indentMatch[0] : "";

        //Codigo usuario
        const userLines = headerCode.replace(/\r?\n/g, "\n").split("\n");
        const reindented = userLines
        .map((l) => {
            if (!l.trim()) return ""; 
            return indent + l;
        })
        .join("\n")
        .trimEnd();

        return `${before}\n${reindented}\n${after}`;
    }

    //Python/js
    const { driver } = splitTemplatePorLenguaje(rawTemplate, lenguaje);
    if (!driver.trim()) return headerCode;

    return `${headerCode.trimEnd()}\n\n${driver}`;
}



function Ejercicio() {
    const { clienteId } = useRequirePreferencias();

    const { id } = useParams();
    const navigate = useNavigate();
    const [ejercicio, setEjercicio] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [lenguaje, setLenguaje] = useState(() => {
    if (typeof window === "undefined") return "python";
        const perExercise = window.localStorage.getItem(`ej_lang_${id}`);
        if (perExercise) return perExercise;
        const globalPref = window.localStorage.getItem("crx_pref_lenguaje");
        return globalPref || "python";
    });
    const [resultados, setResultados] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [loadingFinal, setLoadingFinal] = useState(false);
    // eslint-disable-next-line 
    const [error, setError] = useState(null); 
    const [saving, setSaving] = useState(false);
    const [leftWidth, setLeftWidth] = useState(() => {
        if (typeof window === "undefined") return 40;
        const stored = window.localStorage.getItem("ej_leftWidth");
        const num = stored != null ? Number(stored) : NaN;
        if (!Number.isFinite(num)) return 40;
        return Math.min(60, Math.max(25, num));
    });
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const [editorHeight, setEditorHeight] = useState(() => {
        if (typeof window === "undefined") return 70;
        const stored = window.localStorage.getItem("ej_editorHeight");
        const num = stored != null ? Number(stored) : NaN;
        if (!Number.isFinite(num)) return 70;
        return Math.min(90, Math.max(35, num));
    });

    const isDraggingVertical = useRef(false);
    const [commentCount, setCommentCount] = useState(0);
    const [order, setOrder] = useState("recientes");
    const [showComments, setShowComments] = useState(false);
    const [showPistas, setShowPistas] = useState(false);
    const [pistasProgress, setPistasProgress] = useState({ unlocked: 0, total: 0 });
    const [showHistorial, setShowHistorial] = useState(false);
    const [histCount,   setHistCount]   = useState(0);
    const handleLoadFromHistory = ({ lenguaje: lang, codigo: code }) => {
        try {
            if (lang && lang !== lenguaje) setLenguaje(lang);
            if (typeof code === "string") setCodigo(code);
        } catch (e) {
            console.error("LoadFromHistory fail:", e);
        }
    };
    const openOnly = (which) => {
        setShowComments(which === "comments");
        setShowPistas(which === "pistas");
        setShowHistorial(which === "historial");
        const anchorId =
            which === "comments" ? "exercise-comments" :
            which === "pistas" ? "exercise-hints" :
            which === "historial" ? "exercise-history" : null;
        if (anchorId) {
            setTimeout(() => {
            document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);
        }
    };
    const [showBugReport, setShowBugReport] = useState(false);


    // Cargar ejercicio 
    useEffect(() => {
        const fetchEjercicio = async () => {
            try {
                const res = await authFetch(`${API_BASE}/ejercicios/${id}`);
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

    //Cargar codigo guardado
    useEffect(() => {
        const fetchCodigoGuardado = async () => {
            if (!clienteId || !ejercicio) return;
            try {
            const res = await fetch(`${API_BASE}/codigoGuardado/${clienteId}/${ejercicio.id_ejercicio}/${lenguaje}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.codigo) {
                const saved = data.codigo
                ?.replace(/\\n/g, "\n")
                .replace(/\\t/g, "    ");
                setCodigo(saved || "");
            } else {
                const rawTpl = ejercicio.plantillas?.[lenguaje] || "";
                const { header } = splitTemplatePorLenguaje(rawTpl, lenguaje);
                const editable = header || rawTpl;
                setCodigo(
                editable
                    ?.replace(/\\n/g, "\n")
                    .replace(/\\t/g, "    ") || ""
                );
            }
            } catch (err) {
            console.error("Error cargando código guardado:", err);
            }
        };
        fetchCodigoGuardado();
    }, [clienteId, ejercicio, lenguaje]);

    //Guardar codigo automatico
    useEffect(() => {
        if (!clienteId || !ejercicio) return;
        if (codigo === undefined) return;

        const timeout = setTimeout(async () => {
            setSaving(true);
            try {
                await fetch(`${API_BASE}/codigoGuardado`, {
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

    // Contador comentarios
    useEffect(() => {
        if (!id) return;
        const loadCount = async () => {
            try {
            const res = await fetch(`${API_BASE}/ejercicio-comentarios/${id}/count`);
            if (!res.ok) return;
            const { count } = await res.json();
            setCommentCount(count ?? 0);
            } catch (err) {
                console.error("Error cargando numero comentarios:", err);
            }
        };
        loadCount();
    }, [id]);

    // Contador pistas
    useEffect(() => {
    if (!id || !clienteId) return;

    const loadPistasProgress = async () => {
        try {
        const res = await fetch(`${API_BASE}/ejercicio-pistas/${id}/progress?cliente=${clienteId}`);

        if (!res.ok) {
            let body = null;
            try {
            body = await res.json();
            // eslint-disable-next-line 
            } catch (_) {}
            console.error("Error pistas progress:", res.status, body);
            return;
        }

        const data = await res.json();
        setPistasProgress({
            total: data.total ?? 0,
            unlocked: data.unlocked ?? 0,
        });
        } catch (e) {
        console.error("Error cargando progreso de pistas:", e);
        }
    };

    loadPistasProgress();
    }, [id, clienteId]);

    // Contador historial 
    useEffect(() => {
    if (!id || !clienteId) return;

    const loadHistCount = async () => {
        try {
        const res = await authFetch(`${API_BASE}/historial/ejercicio/${id}/count`);
        if (!res.ok) {
            let body = null;
            try {
            body = await res.json();
            // eslint-disable-next-line 
            } catch (_) {}
            console.error("Error historial count:", res.status, body);
            return;
        }
        const data = await res.json();
        setHistCount(data.count ?? 0);
        } catch (e) {
        console.error("Error cargando historial count:", e);
        }
    };

    loadHistCount();
    }, [id, clienteId]);

    //Guardar ultimo lenguaje usado 
    useEffect(() => {
        if (!id) return;
        if (typeof window === "undefined") return;
        window.localStorage.setItem(`ej_lang_${id}`, lenguaje);
    }, [id, lenguaje]);



    //Drag horizontal (panel izquierdo)
    const startDrag = () => (isDragging.current = true);
    const stopDrag = () => (isDragging.current = false);
    const onDrag = (e) => {
        if (!isDragging.current || !containerRef.current) return;
        const bounds = containerRef.current.getBoundingClientRect();
        let newWidth = ((e.clientX - bounds.left) / bounds.width) * 100;
        newWidth = Math.max(25, Math.min(60, newWidth));
        setLeftWidth(newWidth);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("ej_leftWidth", String(newWidth));
        }
    };

    //Drag vertical (editor / resultados)
    const startVerticalDrag = () => (isDraggingVertical.current = true);
    const stopVerticalDrag = () => (isDraggingVertical.current = false);
    const onVerticalDrag = (e) => {
        if (!isDraggingVertical.current || !containerRef.current) return;
        const bounds = containerRef.current.getBoundingClientRect();
        let newHeight = ((e.clientY - bounds.top) / bounds.height) * 100;
        newHeight = Math.max(35, Math.min(90, newHeight));
        setEditorHeight(newHeight);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("ej_editorHeight", String(newHeight));
        }
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
        const rawTpl = ejercicio.plantillas?.[lenguaje] || "";
        const { header } = splitTemplatePorLenguaje(rawTpl, lenguaje);

        const plantillaEditable =
            header
            ?.replace(/\\n/g, "\n")
            .replace(/\\t/g, "    ") ||
            rawTpl
            ?.replace(/\\n/g, "\n")
            .replace(/\\t/g, "    ") ||
            "";

        setCodigo(plantillaEditable);

        await fetch(`${API_BASE}/codigoGuardado`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            id_cliente: clienteId,
            id_ejercicio: ejercicio.id_ejercicio,
            lenguaje,
            codigo: plantillaEditable,
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
            //asegurar token válido (refresh)
            const accessToken = await getValidAccessToken();
            if (!accessToken) {
                toast.error("Sesión vencida. Por favor volvé a iniciar sesión.");
                navigate("/logout");
                setLoadingSubmit(false);
                return;
            }

            const fullSource = reconstructionCode(
            codigo,
            ejercicio.plantillas?.[lenguaje] || "",
            lenguaje
            );

            //Consult suscription
            let esPremium = false;
            try {
                const susRes = await authFetch(`${API_BASE}/suscripcion/mi`, { method: "GET" });
                if (susRes.ok) {
                    const susBody = await susRes.json().catch(() => ({}));
                    const s = susBody.suscripcion;
                    esPremium = !!(s && s.estado === "activo" && s.periodo_fin && new Date(s.periodo_fin) > new Date());
                } else if (susRes.status === 401 || susRes.status === 403) {
                    toast.error("No autorizado. Volve a iniciar sesión");
                    navigate("/logout");
                    setLoadingSubmit(false);
                    return;
                }
            } catch (e) {
            console.warn("No se pudo verificar suscripción:", e);
            }

            if (!esPremium) {
                toast("Tu envío no tiene prioridad (Suscripción gratuita). Submits gratuitos: 5/día", { timeout: 4000 });
            } 

            //submit con authFetch 
            const res = await authFetch(`${API_BASE}/submit`, {
                method: "POST",
                body: JSON.stringify({
                    id_cliente: clienteId,
                    id_ejercicio: ejercicio.id_ejercicio,
                    codigo_fuente: fullSource,
                    lenguaje,
                }),
            });

            //Cabeceras rate-limit 
            const remainingHeader = res.headers.get("X-RateLimit-Remaining");
            if (remainingHeader !== null) {
                const left = isFinite(Number(remainingHeader)) ? Number(remainingHeader) : null;
            if (left !== null) {
                toast(`Envíos restantes hoy: ${left}`, { timeout: 3000 });
            }
            }

            if (!res.ok) {
            //Limite
            if (res.status === 429) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error);
            }
            throw new Error(`HTTP ${res.status}`);
            }

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
            const msg = err?.message || "Error al enviar el codigo.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleFinalSubmit = async () => {
        setLoadingFinal(true);
        try {
            const accessToken = await getValidAccessToken();
            if (!accessToken) {
            toast.error("Sesión vencida. Por favor volvé a iniciar sesión.");
            navigate("/logout");
            setLoadingFinal(false);
            return;
            }

            const fullSource = reconstructionCode(
            codigo,
            ejercicio.plantillas?.[lenguaje] || "",
            lenguaje
            );

            let esPremium = false;
            try {
            const susRes = await authFetch(`${API_BASE}/suscripcion/mi`, { method: "GET" });
            if (susRes.ok) {
                const susBody = await susRes.json().catch(() => ({}));
                const s = susBody.suscripcion;
                esPremium = !!(s && s.estado === "activo" && s.periodo_fin && new Date(s.periodo_fin) > new Date());
            } else if (susRes.status === 401 || susRes.status === 403) {
                toast.error("No autorizado. Volvé a iniciar sesión.");
                navigate("/logout");
                setLoadingFinal(false);
                return;
            }
            } catch (e) {
            console.warn("No se pudo verificar suscripción (final):", e);
            }

            if (!esPremium) {
            toast("Tu envío no tiene prioridad (Suscripción gratuita). Submits gratuitos: 5/día", { timeout: 4000 });
            } 

            const res = await authFetch(`${API_BASE}/submit-final`, {
            method: "POST",
            body: JSON.stringify({
                id_ejercicio: ejercicio.id_ejercicio,
                codigo_fuente: fullSource,
                codigo_editor: codigo, 
                lenguaje,
            }),
            });

            const remainingHeader = res.headers.get("X-RateLimit-Remaining");
            if (remainingHeader !== null) {
            const left = isFinite(Number(remainingHeader)) ? Number(remainingHeader) : null;
            if (left !== null) toast(`Envíos restantes hoy: ${left}`, { timeout: 3000 });
            }

            if (!res.ok) {
            if (res.status === 429) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Límite de envíos alcanzado");
            }
            if (res.status === 401) {
                toast.error("Sesión inválida. Volvé a iniciar sesión.");
                navigate("/logout");
                return;
            }
            throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            const idSubmit = data.insert?.id_submit_final ?? data.id_submit_final ?? "";

            if (Array.isArray(data?.nuevosLogros) && data.nuevosLogros.length) {
            data.nuevosLogros.forEach(l => {
                toast.success(`¡Logro desbloqueado! ${l.icono} ${l.titulo} ${l.xp_otorgado ? `(+${l.xp_otorgado} XP)` : ""}`);
            });
            }

        /*  if (data.reward?.amount) {
                toast.success(`+${data.reward.amount} XP ${data.reward.icon || ""}`, { timeout: 3000 });
            } */

            if (data.resultado === "aceptado" && data.reward?.amount) {
            const qs = new URLSearchParams({
                reward: String(data.reward.amount),
                icon: data.reward.icon || "⭐",
            }).toString();

            navigate(`/resultado/${idSubmit}?${qs}`, {
                replace: false,
                state: { reward: data.reward, codigoEditor: codigo },
            });
            } else {
            navigate(`/resultado/${idSubmit}`);
            }

        } catch (err) {
            console.error("Error en submit final:", err);
            const msg = err?.message || "Error al enviar el código final.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoadingFinal(false);
        }
    };

    if (!ejercicio) return <div className="loading">Cargando...</div>;

    return (
        <>
        <Navbar />
        <div className="ejercicio-page" ref={containerRef}>
            {/* PANEL IZQUIERDO */}
            <div className="left-panel" style={{ width: `${leftWidth}%` }}>
                <div className="ejercicio-header">
                    <h2>{ejercicio.titulo}</h2>
                    <p className="descripcion">{ejercicio.descripcion}</p>
                    <p className="dificultad">
                        Dificultad: {["Fácil", "Intermedio", "Difícil", "Experto"][ejercicio.dificultad - 1]}
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

                {showPistas && (
                    <EjercicioPistas
                    idEjercicio={ejercicio.id_ejercicio}
                    idCliente={clienteId}
                    onProgress={setPistasProgress}
                    />
                )}

                {showHistorial && (
                    <EjercicioHistorial
                        idEjercicio={ejercicio.id_ejercicio}
                        idCliente={clienteId}
                        onCountChange={setHistCount}
                        onLoadFromHistory={handleLoadFromHistory}
                    />
                )}

                <div className="ej-toolbar">
                {/* Comentarios */}
                <button
                    className={`ej-icon ${showComments ? "is-active" : ""}`}
                    onClick={() => openOnly(showComments ? "" : "comments")}
                    title="Comentarios"
                >
                    <i className="fa-regular fa-comment"></i>
                    {commentCount > 0 && <span className="ej-badge">{commentCount}</span>}
                </button>

                {/* Pistas */}
                <button
                    className={`ej-icon ${showPistas ? "is-active" : ""}`}
                    onClick={() => openOnly(showPistas ? "" : "pistas")}
                    title="Pistas"
                >
                    <i className="fa-regular fa-lightbulb"></i>
                    {pistasProgress.total > 0 && (
                    <span className="ej-badge">
                        {pistasProgress.unlocked}/{pistasProgress.total}
                    </span>
                    )}
                </button>

                {/* Historial */}
                <button
                    className={`ej-icon ${showHistorial ? "is-active" : ""}`}
                    onClick={() => openOnly(showHistorial ? "" : "historial")}
                    title="Historial"
                >
                    <i className="fa-solid fa-clock-rotate-left"></i>
                    {histCount > 0 && <span className="ej-badge">{histCount}</span>}
                </button>

                {/* Reporte bug */}
                <button
                className={`ej-icon ${showBugReport ? "is-active" : ""}`}
                onClick={() => setShowBugReport(true)}
                title="Reportar problema en este ejercicio"
                >
                <i className="fa-regular fa-flag"></i>
                </button>

                <div className="ej-spacer" />

                {/* Filtros comentarios */}
                {showComments && (
                    <div className="ej-filters">
                    <button
                        className={`ej-chip ${order === "recientes" ? "is-active" : ""}`}
                        onClick={() => setOrder("recientes")}
                        title="Más recientes"
                    >
                        <i className="fa-solid fa-arrow-down-short-wide"></i>
                    </button>
                    <button
                        className={`ej-chip ${order === "populares" ? "is-active" : ""}`}
                        onClick={() => setOrder("populares")}
                        title="Más populares"
                    >
                        <i className="fa-solid fa-fire"></i>
                    </button>
                    </div>
                )}
                </div>

                {showComments && (
                <EjercicioComentarios
                    idEjercicio={ejercicio.id_ejercicio}
                    idCliente={clienteId}
                    order={order}
                    onCountChange={setCommentCount}
                    showTitle={false}   
                />
                )}

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
                                        <th>Entrada</th>
                                        <th>Esperado</th>
                                        <th>Obtenido</th>
                                        <th>Resultado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resultados.map((r) => (
                                        <tr key={r.id_caso} className={r.resultado === "aceptado" ? "resultado-ok" : "resultado-error"}>
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
                {showBugReport && (
                <EjercicioBugReport
                    idEjercicio={ejercicio.id_ejercicio}
                    idCliente={clienteId}
                    lenguaje={lenguaje}
                    codigoActual={reconstructionCode(
                    codigo,
                    ejercicio.plantillas?.[lenguaje] || "",
                    lenguaje
                    )}
                    onClose={() => setShowBugReport(false)}
                />
                )}
            </div>
        </div>
        </>
    );
}

export default Ejercicio;
