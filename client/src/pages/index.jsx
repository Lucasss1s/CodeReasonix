import { useEffect, useState } from "react";
import axios from "axios";

export default function Index() {
    const [ejercicios, setEjercicios] = useState([]);

    useEffect(() => {
        axios.get("http://localhost:5000/ejercicios")
        .then(res => setEjercicios(res.data))
        .catch(err => console.error(err));
    }, []);

    return (
        <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Lista de ejercicios</h1>
        <ul className="space-y-4">
            {ejercicios.map(ej => (
            <li key={ej.id_ejercicio} className="border p-4 rounded-xl shadow">
                <h2 className="text-lg font-semibold">{ej.titulo}</h2>
                <p className="text-sm text-gray-400">Dificultad: {ej.dificultad}</p>
                <a
                href={`/ejercicio/${ej.id_ejercicio}`}
                className="text-blue-500 hover:underline mt-2 block"
                >
                Ver ejercicio
                </a>
            </li>
            ))}
        </ul>
        </div>
    );
    }
