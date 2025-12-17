import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import API_BASE from "../../config/api";
import { authFetch } from "../../utils/authToken";
import "./checkout.css";

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="cr-modal" role="presentation">
      <div className="cr-modal__backdrop" onClick={onClose} />
      <div className="cr-modal__panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="cr-modal__head">
          <h3>{title}</h3>
          <button className="p-iconbtn" onClick={onClose} aria-label="Cerrar"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="cr-modal__body">{children}</div>
      </div>
    </div>
  );
}

/* helper */
const formatDateTime = (v) => {
  try {
    return new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "medium" });
  } catch {
    return v;
  }
};

// Luhn algorithm
function isValidCardNumber(number) {
  const digits = number.replace(/\s+/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isValidExpiry(exp) {
  if (!/^\d{2}\/\d{2}$/.test(exp)) return false;

  const [mm, yy] = exp.split("/").map(Number);
  if (mm < 1 || mm > 12) return false;
  const year = 2000 + yy;

  const expiryDate = new Date(year, mm, 0, 23, 59, 59);
  const now = new Date();

  return expiryDate >= now;
}

function isValidCvv(cvv) {
  return typeof cvv === "string" && /^\d{3}$/.test(cvv);
}

export default function Checkout() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [sus, setSus] = useState(null);
  const [error, setError] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // eslint-disable-next-line 
  const idFromQuery = search.get("id") || null; 
  const price = "5000";

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [card, setCard] = useState({
    number: "",
    exp: "",
    cvv: ""
  });

  const fetchSus = async () => {
    try {
      const res = await authFetch(`${API_BASE}/suscripcion/mi`, { method: "GET" });
      if (res.ok) {
        const b = await res.json().catch(() => ({}));
        setSus(b.suscripcion ?? null);
      } else {
        setSus(null);
      }
    } catch (e) {
      console.warn("fetchSus error:", e);
      setSus(null);
      setError("No se pudo consultar el estado de suscripción.");
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!mounted) return;
      await fetchSus();
    };
    load();
    return () => { mounted = false; };
  }, []);

  //flujo pago
  const handleConfirmPayment = async () => {
    if (!card.number) {
      toast.error("Ingresa el numero de la tarjeta");
      return;
    }

    if (!isValidCardNumber(card.number)) {
      toast.error("El numero de tarjeta no es valido");
      return;
    }

    if (!card.exp) {
      toast.error("Ingresa la fecha de vencimiento");
      return;
    }

    if (!isValidExpiry(card.exp)) {
      toast.error("La fecha de vencimiento es invalida o esta vencida");
      return;
    }

    if (!card.cvv) {
      toast.error("Ingresa el CVV");
      return;
    }

    if (!isValidCvv(card.cvv)) {
      toast.error("El CVV debe tener 3 digitos");
      return;
    }

    setLoading(true);

    try {
      //Crear pago
      const resCreate = await authFetch(`${API_BASE}/pagos/create`, {
        method: "POST",
        body: JSON.stringify({ monto: Number(price), moneda: "ARS" })
      });

      if (!resCreate.ok) {
        const b = await resCreate.json().catch(() => ({}));
        throw new Error(b.error || "No se pudo iniciar el pago");
      }

      const { pago } = await resCreate.json();
      if (!pago?.id_pago) {
        throw new Error("Pago inválido");
      }

      //Confirmar pago 
      const resConfirm = await authFetch(
        `${API_BASE}/pagos/${pago.id_pago}/confirm`,
        {
          method: "POST",
          body: JSON.stringify({
            card_number: card.number,
            exp: card.exp,
            cvv: card.cvv
          })
        }
      );

      if (!resConfirm.ok) {
        const b = await resConfirm.json().catch(() => ({}));
        throw new Error(b.error || "Pago rechazado");
      }

      const body = await resConfirm.json();
      setSus(body.suscripcion ?? null);

      toast.success("Pago aprobado. Suscripción activada.");
      await fetchSus();
      setShowPaymentModal(false);
      setCard({ number: "", exp: "", cvv: "" });

    } catch (e) {
      console.error("checkout payment error:", e);
      toast.error(e.message || "Error procesando el pago");
    } finally {
      setLoading(false);
    }
  };

  // Cancelar: desactiva auto_renew y guarda cancelado_en (no corta beneficios inmediatos)
  const handleCancelSubscription = async () => {
    setShowCancelConfirm(false);
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/suscripcion/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(()=>({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const b = await res.json().catch(()=>({}));
      setSus(b.suscripcion ?? null);
      toast.success("Renovación automática desactivada. Mantendrás beneficios hasta la fecha de finalización.");
      await fetchSus();
      navigate("/perfil");
    } catch (e) {
      console.error("cancel:", e);
      toast.error(e.message || "No se pudo cancelar la renovación.");
    } finally {
      setLoading(false);
    }
  };

  //reactiva auto_renew 
  const handleRenew = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/suscripcion/renew`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(()=>({}));
        toast.error(body.error || "No se pudo renovar. Intentá nuevamente.");
        await fetchSus();
        return;
      }
      const body = await res.json().catch(()=>({}));
      setSus(body.suscripcion ?? null);
      toast.success("Renovación realizada. Renovación automática activada.");
      await fetchSus();
      navigate("/perfil");
    } catch (e) {
      console.error("renew error:", e);
      toast.error("Error renovando suscripción.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeepFree = () => navigate("/perfil");

  // helpers UI
  const ahora = new Date();
  const vence = sus?.periodo_fin ? new Date(sus.periodo_fin) : null;
  // eslint-disable-next-line 
  const estaActivaHoy = vence && vence > ahora;
  const puedeRenovar = !sus || sus.estado === "inactivo" || (sus.periodo_fin && new Date(sus.periodo_fin) <= ahora);

  if (loadingInitial) {
    return (
      <div className="checkout-page">
        <div className="checkout-wrap">
          <div style={{ marginBottom: 12 }}>
            <button className="p-iconbtn" onClick={() => navigate(-1)} aria-label="Volver"><i className="fa-solid fa-arrow-left" /></button>
          </div>
          <div className="p-skeleton">Cargando opciones de plan…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-wrap">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <button className="p-iconbtn" onClick={() => navigate(-1)} title="Volver"><i className="fa-solid fa-arrow-left" /></button>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ margin: 0, color: "#ffb26f" }}>Elegí tu plan</h1>
            <div className="checkout-sub">Prioridad en ejecuciones, badges exclusivos y soporte</div>
          </div>
          <div style={{ width: 48 }} /> 
        </div>

        {error && <div className="p-alert">{error}</div>}

        <div className="plans-grid">
          {/* Free card */}
          <div className="plan-card plan-free">
            <div className="plan-header">
              <h3>Gratis</h3>
              <span className="plan-badge">Gratis</span>
            </div>
            <div className="plan-price" aria-hidden>—</div>
            <ul>
              <li>5 envíos (submits) por día</li>
              <li>Acceso a ejercicios públicos</li>
              <li>Historial y reseñas</li>
            </ul>
            <div className="plan-note">Seguí con la cuenta gratuita sin cambios.</div>
          </div>

          {/* Premium card */}
          <div className="plan-card plan-premium">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Premium</h3>
              <div className="plan-badge plan-badge--accent">Recomendado</div>
            </div>

            <div className="plan-price">{price} ARS / mes</div>

            <ul>
              <li>Submits priorizados (sin colas)</li>
              <li>Sin delays en ejecución</li>
              <li>Badges exclusivos y soporte</li>
            </ul>

            <div className="plan-actions">
              {puedeRenovar ? (
                <div style={{ display: "flex", gap: 8 }}>
                <button className="p-btn" onClick={() => setShowPaymentModal(true)} disabled={loading}>
                  {`Pagar ${price} ARS`}
                </button>

                  <button className="p-btn p-btn--ghost" onClick={handleKeepFree} disabled={loading}>Volver</button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="p-btn" onClick={() => setShowPlanModal(true)} disabled={loading}>
                    {loading ? "..." : "Ver mi plan"}
                  </button>

                  {sus?.auto_renew === false ? (
                    <button className="p-btn" onClick={handleRenew} disabled={loading} title="Reactivar renovación automática">
                      {loading ? "..." : "Renovar"}
                    </button>
                  ) : (
                    <button className="p-btn p-btn--ghost" onClick={() => setShowCancelConfirm(true)} disabled={loading} title="Desactivar renovación automática">
                      {loading ? "..." : "Cancelar renovación"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18 }} />
      </div>

      {/* Plan modal */}
      <Modal open={showPlanModal} title="Detalles de tu suscripción" onClose={() => setShowPlanModal(false)}>
        {!sus ? (
          <div className="modal-empty">No tenés una suscripción activa en este momento.</div>
        ) : (
          <div className="modal-details">
            <div className="modal-row">
              <div className="modal-label">Estado</div>
              <div className="modal-value">{sus.estado}</div>
            </div>

            {sus.periodo_fin && (
              <div className="modal-row">
                <div className="modal-label">Válida hasta</div>
                <div className="modal-value">{formatDateTime(sus.periodo_fin)}</div>
              </div>
            )}

            <div className="modal-row">
              <div className="modal-label">Renovación automática</div>
              <div className="modal-value">{sus.auto_renew ? "Activada" : "Desactivada"}</div>
            </div>

            {sus.cancelado_en && (
              <div className="modal-row">
                <div className="modal-label">Cancelado en</div>
                <div className="modal-value">{formatDateTime(sus.cancelado_en)}</div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                className="p-btn"
                onClick={() => { setShowPlanModal(false); navigate("/perfil"); }}
              >
                Ir al perfil
              </button>

              {sus.auto_renew === false ? (
                <button
                  className="p-btn"
                  onClick={() => { setShowPlanModal(false); handleRenew(); }}
                >
                  Renovar
                </button>
              ) : (
                <button
                  className="p-btn p-btn--ghost"
                  onClick={() => { setShowPlanModal(false); setShowCancelConfirm(true); }}
                >
                  Cancelar renovación
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel confirm  */}
      <Modal open={showCancelConfirm} title="Confirmar cancelación" onClose={() => setShowCancelConfirm(false)}>
        <p>¿Querés desactivar la renovación automática? Mantendrás los beneficios hasta la fecha de finalización.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="p-btn p-btn--ghost" onClick={() => setShowCancelConfirm(false)}>Volver</button>
          <button className="p-btn" onClick={handleCancelSubscription} disabled={loading}>
            {loading ? "..." : "Confirmar desactivación"}
          </button>
        </div>
      </Modal>

      <Modal open={showPaymentModal} title="Datos de la tarjeta"
        onClose={() => !loading && setShowPaymentModal(false)}
      >
        <div className="payment-form">
          <div className="form-row">
            <label>Número de tarjeta</label>
            <input type="text" placeholder="4242 4242 4242 4242" maxLength={19} value={card.number}
              onChange={(e) => {
                const v = e.target.value
                  .replace(/[^\d]/g, "")
                  .replace(/(.{4})/g, "$1 ")
                  .trim();
                setCard({ ...card, number: v });
              }}
            />
          </div>

          <div className="form-row">
            <label>Vencimiento</label>
            <input type="text" placeholder="MM/AA" maxLength={5} value={card.exp} 
            onChange={(e) => {
                let v = e.target.value.replace(/[^\d]/g, "");
                if (v.length >= 3) {
                  v = v.slice(0, 2) + "/" + v.slice(2, 4);
                }
                setCard({ ...card, exp: v });
              }}
            />
          </div>

          <div className="form-row">
            <label>CVV</label>
            <input type="text" placeholder="123" maxLength={3} value={card.cvv}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                setCard({ ...card, cvv: v });
              }}
            />
          </div>

          <div className="payment-actions">
            <button className="p-btn p-btn--ghost" onClick={() => setShowPaymentModal(false)} disabled={loading}>
              Cancelar
            </button>

          <button className="p-btn" disabled={loading} onClick={handleConfirmPayment}>
            {loading ? "Procesando..." : "Confirmar pago"}
          </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
