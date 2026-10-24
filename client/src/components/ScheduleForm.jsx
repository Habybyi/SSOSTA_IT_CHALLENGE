import { useEffect, useState } from "react";
import { FiCalendar, FiSave, FiX } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { addDaysKey, capitalize, formatDayLong, formatTime, timeOfDay, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

export const ScheduleForm = ({ request, appointment, defaultDuration, onSaved, onCancel, submitLabel = "NAPLÁNOVAŤ" }) => {
  const { token } = useAuth();
  const initialDay = appointment ? toDayKey(appointment.startsAt) : addDaysKey(toDayKey(new Date()), 1);
  const [form, setForm] = useState({
    date: initialDay,
    time: appointment ? timeOfDay(appointment.startsAt) : "08:00",
    durationMin: appointment
      ? String(Math.round((new Date(appointment.endsAt) - new Date(appointment.startsAt)) / 60000))
      : String(defaultDuration || 60),
    technicianId: appointment?.technician?.id || request?.assignedTo?.id || "",
    notes: appointment?.notes || "",
    notifyCustomer: true,
  });
  const [assignees, setAssignees] = useState([]);
  const [dayInfo, setDayInfo] = useState(null);
  const [dayAppointments, setDayAppointments] = useState([]);
  const [error, setError] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!form.date) return;
    setConfirmMessage("");
    Promise.all([api.getCapacity(token, form.date, form.date), api.listAppointments(token, form.date, form.date)])
      .then(([cap, list]) => {
        setDayInfo(cap.days[0]);
        setDayAppointments(list.appointments.filter((a) => a.id !== appointment?.id));
      })
      .catch(() => {});
  }, [form.date, token, appointment?.id]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async (force = false) => {
    setError("");
    setIsSaving(true);
    try {
      const payload = { ...form, durationMin: Number(form.durationMin), force };
      const data = appointment
        ? await api.updateAppointment(token, appointment.id, payload)
        : await api.createAppointment(token, { ...payload, serviceRequestId: request.id });
      onSaved(data.appointment);
    } catch (err) {
      if (err.code === "CAPACITY_FULL" || err.code === "TECHNICIAN_BUSY") setConfirmMessage(err.message);
      else setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const otherRequests = dayAppointments.filter((a) => !request || a.serviceRequest?.id !== request.id);
  const cities = [...new Set(otherRequests.map((a) => a.garden.city))];
  const sameCity = request?.garden && cities.includes(request.garden.city);

  return (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <label className={styles.field}>
          <span className={styles.label}>Deň</span>
          <span className={styles.inputWrapper}>
            <input type="date" className={styles.input} value={form.date} onChange={update("date")} />
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Čas</span>
          <span className={styles.inputWrapper}>
            <input type="time" step="900" className={styles.input} value={form.time} onChange={update("time")} />
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Trvanie (min.)</span>
          <span className={styles.inputWrapper}>
            <input type="number" min="15" step="15" className={styles.input} value={form.durationMin} onChange={update("durationMin")} />
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Technik</span>
          <span className={styles.inputWrapper}>
            <select className={styles.select} value={form.technicianId} onChange={update("technicianId")}>
              <option value="">Zatiaľ nikto</option>
              {assignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>

      {dayInfo && (
        <div className={dayInfo.free > 0 ? styles.calloutBox : styles.calloutWarning}>
          <FiCalendar style={{ verticalAlign: "-2px" }} /> <strong>{capitalize(formatDayLong(form.date))}</strong>:{" "}
          {dayInfo.max === 0 ? "nepracovný deň" : `obsadené ${dayInfo.booked} z ${dayInfo.max} výjazdov`}
          {dayInfo.note && ` (${dayInfo.note})`}
          {dayAppointments.length > 0 && (
            <div className={styles.muted} style={{ marginTop: "0.35rem" }}>
              V ten deň: {dayAppointments.map((a) => `${formatTime(a.startsAt)} ${a.garden.city}`).join(", ")}
            </div>
          )}
          {sameCity && (
            <div style={{ marginTop: "0.35rem", fontWeight: 600 }}>V ten deň sa už ide do obce {request.garden.city}, hodí sa to spojiť.</div>
          )}
        </div>
      )}

      <label className={styles.field}>
        <span className={styles.label}>Poznámka k termínu</span>
        <span className={styles.inputWrapper}>
          <input className={styles.input} value={form.notes} onChange={update("notes")} placeholder="napr. zvoniť na susedov" />
        </span>
      </label>

      <label className={styles.checkboxLabel}>
        <input type="checkbox" checked={form.notifyCustomer} onChange={update("notifyCustomer")} />
        Poslať zákazníkovi e-mail s termínom
      </label>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {confirmMessage ? (
        <div className={styles.calloutWarning}>
          {confirmMessage}
          <div className={styles.buttonRow} style={{ marginTop: "0.75rem" }}>
            <button type="button" className={styles.secondaryButton} onClick={() => setConfirmMessage("")}>
              Vybrať iný čas
            </button>
            <button type="button" className={styles.primaryButtonInline} onClick={() => save(true)} disabled={isSaving}>
              Naplánovať aj tak
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
          {onCancel && (
            <button type="button" className={styles.secondaryButton} onClick={onCancel}>
              <FiX /> Zrušiť
            </button>
          )}
          <button type="button" className={styles.primaryButtonInline} onClick={() => save(false)} disabled={isSaving}>
            <FiSave /> {isSaving ? "UKLADÁM…" : submitLabel}
          </button>
        </div>
      )}
    </div>
  );
};
