import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiSettings, FiMap } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { AppointmentModal } from "../components/AppointmentModal";
import { ScheduleSettingsPanel } from "../components/ScheduleSettingsPanel";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { REQUEST_TYPE_LABELS } from "../utils/labels";
import { addDaysKey, formatDayShort, formatTime, fromDayKey, mondayOf, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const initialsOf = (name) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Týždenný kalendár výjazdov. Pri každom dni je kapacita (obsadené/max), majiteľ ju vie zmeniť kliknutím.
export const CalendarPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toDayKey(new Date());
  const weekStart = mondayOf(searchParams.get("week") || today);
  const weekEnd = addDaysKey(weekStart, 6);
  const isOwner = user.role === "OWNER";

  const [technicianId, setTechnicianId] = useState(isOwner ? "" : user.id);
  const [assignees, setAssignees] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [token]);

  const load = useCallback(async () => {
    setError("");
    try {
      const [list, cap] = await Promise.all([
        api.listAppointments(token, weekStart, weekEnd, technicianId || undefined),
        api.getCapacity(token, weekStart, weekEnd),
      ]);
      setAppointments(list.appointments);
      setCapacity(cap.days);
    } catch (err) {
      setError(err.message);
    }
  }, [token, weekStart, weekEnd, technicianId]);

  useEffect(() => {
    load();
  }, [load]);

  const goWeek = (offset) => setSearchParams({ week: addDaysKey(weekStart, offset * 7) });

  const editCapacity = async (day) => {
    if (!isOwner) return;
    const value = window.prompt(
      `Koľko výjazdov sa zmestí na ${formatDayShort(day.date)}?\n0 = voľno, prázdne = predvolené nastavenie`,
      day.isOverride ? String(day.max) : ""
    );
    if (value === null) return;
    try {
      if (value.trim() === "") await api.resetDayCapacity(token, day.date);
      else await api.setDayCapacity(token, day.date, { maxVisits: Number(value) });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const weekLabel = `${fromDayKey(weekStart).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric" })} až ${fromDayKey(
    weekEnd
  ).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" })}`;
  const reservedCount = appointments.filter((a) => a.status === "RESERVED").length;

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Kalendár</h1>
        <div className={styles.buttonRow}>
          <Link to="/calendar/planner" className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
            <FiMap /> PLÁNOVAČ SEZÓNY
          </Link>
          {isOwner && (
            <button type="button" className={styles.iconButton} onClick={() => setShowSettings((v) => !v)} title="Nastavenia plánovania">
              <FiSettings />
            </button>
          )}
        </div>
      </div>

      {showSettings && (
        <ScheduleSettingsPanel
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false);
            load();
          }}
        />
      )}

      <div className={styles.toolbar} style={{ alignItems: "center" }}>
        <div className={styles.buttonRow} style={{ alignItems: "center" }}>
          <button type="button" className={styles.iconButton} onClick={() => goWeek(-1)} title="Predchádzajúci týždeň">
            <FiChevronLeft />
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => setSearchParams({})}>
            Dnes
          </button>
          <button type="button" className={styles.iconButton} onClick={() => goWeek(1)} title="Ďalší týždeň">
            <FiChevronRight />
          </button>
          <strong style={{ color: "var(--neu-text)", marginLeft: "0.5rem" }}>{weekLabel}</strong>
        </div>
        <div className={styles.inputWrapper} style={{ flex: "0 1 220px", marginLeft: "auto" }}>
          <select className={styles.select} value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">Všetci technici</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {reservedCount > 0 && (
        <div className={styles.calloutWarning} style={{ marginBottom: "1rem" }}>
          Rezervácie zo webu bez presného času: <strong>{reservedCount}</strong>. Klikni na ne a potvrď čas.
        </div>
      )}
      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className={styles.weekWrap}>
        <div className={styles.weekGrid}>
          {capacity.map((day) => {
            const items = appointments.filter((a) => toDayKey(a.startsAt) === day.date);
            const isToday = day.date === today;
            const columnClass = isToday ? styles.dayColumnToday : day.max === 0 ? styles.dayColumnOff : styles.dayColumn;
            const fill = day.max ? Math.min(100, (day.booked / day.max) * 100) : 100;
            return (
              <div key={day.date} className={columnClass}>
                <div className={styles.dayHeader}>
                  <span>{formatDayShort(day.date)}</span>
                  <button
                    type="button"
                    className={styles.capacityButton}
                    onClick={() => editCapacity(day)}
                    disabled={!isOwner}
                    title={isOwner ? "Zmeniť kapacitu dňa" : undefined}
                  >
                    <span className={styles.capacityText}>
                      {day.max === 0 ? "voľno" : `${day.booked}/${day.max} výjazdov`}
                      {day.note ? ` · ${day.note}` : ""}
                    </span>
                    {day.max > 0 && (
                      <span className={styles.capacityBar}>
                        <span className={day.booked >= day.max ? styles.capacityFillFull : styles.capacityFill} style={{ width: `${fill}%`, display: "block" }} />
                      </span>
                    )}
                  </button>
                </div>
                {items.map((a) => {
                  const chipClass =
                    a.status === "RESERVED"
                      ? styles.apptChipReserved
                      : a.serviceRequest?.priority === "EMERGENCY"
                        ? styles.apptChipEmergency
                        : styles.apptChip;
                  return (
                    <button key={a.id} type="button" className={chipClass} onClick={() => setSelected(a)}>
                      <span className={styles.apptTime}>
                        {a.status === "RESERVED" ? "čas ?" : formatTime(a.startsAt)}
                        {a.technician && ` · ${initialsOf(a.technician.name)}`}
                      </span>
                      <span>
                        {a.garden.customer.lastName}, {a.garden.city}
                      </span>
                      <span className={styles.apptMeta}>
                        {a.serviceRequest ? `#${a.serviceRequest.number} ${REQUEST_TYPE_LABELS[a.serviceRequest.type]}` : a.notes}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <AppointmentModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </AppShell>
  );
};
