import { useState } from "react";
import { Link } from "react-router-dom";
import { FiX, FiPhone, FiMapPin, FiInbox, FiHome, FiTrash2, FiEdit2, FiCheck, FiPlayCircle } from "react-icons/fi";
import { ScheduleForm } from "./ScheduleForm";
import { PriorityBadge } from "./RequestCard";
import { Portal } from "./Portal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { APPOINTMENT_STATUS_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import { capitalize, formatDayLong, formatTime, fullName, mapsUrl, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

// Detail výjazdu z kalendára: kontakt, navigácia, presun, potvrdenie rezervácie, zrušenie.
export const AppointmentModal = ({ appointment, onClose, onChanged }) => {
  const { token } = useAuth();
  const [mode, setMode] = useState(appointment.status === "RESERVED" ? "confirm" : "view");
  const [cancelNote, setCancelNote] = useState("");
  const [error, setError] = useState("");
  const a = appointment;
  const customer = a.garden.customer;
  const request = a.serviceRequest;

  const handleCancel = async () => {
    setError("");
    try {
      await api.cancelAppointment(token, a.id, { note: cancelNote });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Portal>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.sectionHeader} style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
            <h2 className={styles.sectionTitle} style={{ flex: 1 }}>
              {capitalize(formatDayLong(toDayKey(a.startsAt)))}
              {a.status === "RESERVED" ? "" : `, ${formatTime(a.startsAt)} až ${formatTime(a.endsAt)}`}
            </h2>
            <button type="button" className={styles.iconButton} onClick={onClose} title="Zavrieť">
              <FiX />
            </button>
          </div>

          <div className={styles.chipRow} style={{ marginBottom: "1rem" }}>
            <span className={a.status === "RESERVED" ? styles.badgeHigh : styles.badgeGreen}>{APPOINTMENT_STATUS_LABELS[a.status]}</span>
            {request && <span className={styles.badge}>{REQUEST_TYPE_LABELS[request.type]}</span>}
            {request && <PriorityBadge priority={request.priority} />}
            <span className={styles.badge}>{a.technician ? a.technician.name : "bez technika"}</span>
          </div>

          <div className={styles.list} style={{ marginBottom: "1rem" }}>
            <div className={styles.listCard}>
              <span className={styles.listCardMain}>
                <span className={styles.listCardTitle}>{fullName(customer)}</span>
                <span className={styles.listCardMeta}>
                  {a.garden.street}, {a.garden.city}
                </span>
              </span>
              {customer.phone && (
                <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className={styles.iconButton} title="Zavolať">
                  <FiPhone />
                </a>
              )}
              <a href={mapsUrl(a.garden)} target="_blank" rel="noreferrer" className={styles.iconButton} title="Navigovať">
                <FiMapPin />
              </a>
            </div>
            <div className={styles.buttonRow}>
              {request && (
                <Link to={`/requests/${request.id}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
                  <FiInbox /> Požiadavka #{request.number}
                </Link>
              )}
              <Link to={`/gardens/${a.garden.id}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
                <FiHome /> Technická karta
              </Link>
            </div>
          </div>

          {a.notes && mode === "view" && (
            <div className={styles.calloutBox} style={{ marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
              {a.notes}
            </div>
          )}

          {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

          {mode === "view" && a.status !== "DONE" && (
            <Link to={`/visits/${a.id}`} className={styles.primaryButton} style={{ textDecoration: "none", marginBottom: "0.85rem" }}>
              <FiPlayCircle /> OTVORIŤ VÝJAZD (karta a materiál)
            </Link>
          )}

          {mode === "view" && a.status !== "DONE" && (
            <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
              <button type="button" className={styles.dangerButton} onClick={() => setMode("cancel")}>
                <FiTrash2 /> Zrušiť termín
              </button>
              <button type="button" className={styles.secondaryButton} onClick={() => setMode("edit")}>
                <FiEdit2 /> Presunúť
              </button>
            </div>
          )}

          {a.status === "DONE" && (
            <Link to={`/visits/${a.id}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
              <FiCheck /> Výjazd je hotový, zobraziť zápis
            </Link>
          )}

          {(mode === "edit" || mode === "confirm") && (
            <>
              {mode === "confirm" && (
                <p className={styles.muted} style={{ marginTop: 0 }}>
                  Zákazník si rezervoval tento deň na webe. Doplň presný čas a technika, zákazník dostane potvrdenie.
                </p>
              )}
              <ScheduleForm
                request={request ? { ...request, garden: a.garden } : null}
                appointment={a}
                submitLabel={mode === "confirm" ? "POTVRDIŤ TERMÍN" : "ULOŽIŤ ZMENU"}
                onSaved={onChanged}
                onCancel={() => setMode("view")}
              />
            </>
          )}

          {mode === "cancel" && (
            <div className={styles.form}>
              <label className={styles.field}>
                <span className={styles.label}>Dôvod (dostane ho aj zákazník)</span>
                <span className={styles.inputWrapper}>
                  <input className={styles.input} value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder="napr. prší, presunieme" />
                </span>
              </label>
              <p className={styles.muted} style={{ margin: 0 }}>
                Ak požiadavka nemá iný termín, vráti sa medzi nové, aby sa na ňu nezabudlo.
              </p>
              <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
                <button type="button" className={styles.secondaryButton} onClick={() => setMode("view")}>
                  Späť
                </button>
                <button type="button" className={styles.dangerButton} onClick={handleCancel}>
                  <FiCheck /> Áno, zrušiť
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};
