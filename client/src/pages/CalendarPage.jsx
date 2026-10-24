import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiSettings, FiMap, FiNavigation } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { AppointmentModal } from "../components/AppointmentModal";
import { ScheduleSettingsPanel } from "../components/ScheduleSettingsPanel";
import { Modal } from "../components/Modal";
import { PagedList } from "../components/PagedList";
import { useElementSize, useIsMobile } from "../hooks";
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

const AppointmentChip = ({ a, onClick }) => {
  const chipClass =
    a.status === "RESERVED"
      ? styles.apptChipReserved
      : a.serviceRequest?.priority === "EMERGENCY"
        ? styles.apptChipEmergency
        : styles.apptChip;
  return (
    <button type="button" className={chipClass} onClick={onClick} style={{ height: 64, flex: "none" }}>
      <span className={styles.apptTime}>
        {a.status === "DONE" ? "✓ " : ""}
        {a.status === "RESERVED" ? "čas ?" : formatTime(a.startsAt)}
        {a.technician && ` · ${initialsOf(a.technician.name)}`}
      </span>
      <span className={styles.apptMeta} style={{ color: "var(--neu-text)" }}>
        {a.garden.customer.lastName}, {a.garden.city}
      </span>
      <span className={styles.apptMeta}>
        {a.serviceRequest ? `#${a.serviceRequest.number} ${REQUEST_TYPE_LABELS[a.serviceRequest.type]}` : a.notes}
      </span>
    </button>
  );
};

const centerInStrip = (el) => {
  if (!el) return;
  const strip = el.parentElement;
  strip.scrollLeft = el.offsetLeft - strip.offsetLeft - (strip.clientWidth - el.clientWidth) / 2;
};

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
  const [dayList, setDayList] = useState(null);
  const [focusDay, setFocusDay] = useState(today);
  const areaRef = useRef(null);
  const { width: areaWidth, height: areaHeight } = useElementSize(areaRef);
  const isMobile = useIsMobile();
  const dayMode = isMobile || (areaWidth > 0 && areaWidth < 760);
  const chipsPerDay = Math.max(1, Math.floor((areaHeight - 90) / 71));

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
          <Link
            to={`/calendar/route?day=${capacity.some((d) => d.date === focusDay) ? focusDay : weekStart}`}
            className={styles.secondaryButton}
            style={{ textDecoration: "none" }}
          >
            <FiNavigation /> TRASA DŇA
          </Link>
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
        <Modal title="Nastavenia plánovania" wide onClose={() => setShowSettings(false)}>
          <ScheduleSettingsPanel
            onClose={() => setShowSettings(false)}
            onSaved={() => {
              setShowSettings(false);
              load();
            }}
          />
        </Modal>
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
        <p className={styles.muted} style={{ margin: "0 0 0.75rem", flex: "none" }}>
          <span className={styles.badgeHigh}>{reservedCount} na potvrdenie</span> Rezervácie zo webu bez presného času (žltý okraj). Klikni a potvrď čas.
        </p>
      )}
      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <div ref={areaRef} className={styles.weekArea}>
        {dayMode ? (
          <>
            <div className={styles.dayStrip}>
              {capacity.map((day) => {
                const count = appointments.filter((a) => toDayKey(a.startsAt) === day.date).length;
                const active = (capacity.some((d) => d.date === focusDay) ? focusDay : weekStart) === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    className={active ? styles.dayStripButtonActive : styles.dayStripButton}
                    ref={active ? centerInStrip : undefined}
                    onClick={() => setFocusDay(day.date)}
                    style={day.max === 0 ? { opacity: 0.5 } : undefined}
                  >
                    <strong>{formatDayShort(day.date)}</strong>
                    <span>{day.max === 0 ? "voľno" : `${count}/${day.max}`}</span>
                  </button>
                );
              })}
            </div>
            {(() => {
              const dayKey = capacity.some((d) => d.date === focusDay) ? focusDay : weekStart;
              const day = capacity.find((d) => d.date === dayKey);
              const items = appointments.filter((a) => toDayKey(a.startsAt) === dayKey);
              return (
                <section className={styles.panelFill}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>{formatDayShort(dayKey)}</h2>
                    {day && (
                      <button type="button" className={styles.linkButton} onClick={() => editCapacity(day)} disabled={!isOwner}>
                        {day.max === 0 ? "voľno" : `${day.booked}/${day.max} výjazdov`}
                        {day.note ? ` · ${day.note}` : ""}
                      </button>
                    )}
                  </div>
                  <PagedList
                    items={items}
                    rowHeight={64}
                    empty={<p className={styles.emptyState}>V tento deň nie sú výjazdy.</p>}
                    renderItem={(a) => <AppointmentChip a={a} onClick={() => setSelected(a)} />}
                  />
                </section>
              );
            })()}
          </>
        ) : (
          <div className={styles.weekGrid}>
            {capacity.map((day) => {
              const items = appointments.filter((a) => toDayKey(a.startsAt) === day.date);
              const isToday = day.date === today;
              const columnClass = isToday ? styles.dayColumnToday : day.max === 0 ? styles.dayColumnOff : styles.dayColumn;
              const fill = day.max ? Math.min(100, (day.booked / day.max) * 100) : 100;
              const overflow = items.length > chipsPerDay;
              const visible = overflow ? items.slice(0, Math.max(0, chipsPerDay - 1)) : items;
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
                  <div className={styles.chipArea}>
                    {visible.map((a) => (
                      <AppointmentChip key={a.id} a={a} onClick={() => setSelected(a)} />
                    ))}
                    {overflow && (
                      <button type="button" className={styles.moreButton} onClick={() => setDayList({ day: day.date, items })}>
                        +{items.length - visible.length} ďalšie
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {dayList && (
        <Modal title={`Výjazdy: ${formatDayShort(dayList.day)}`} onClose={() => setDayList(null)}>
          <div className={styles.list}>
            {dayList.items.map((a) => (
              <AppointmentChip
                key={a.id}
                a={a}
                onClick={() => {
                  setDayList(null);
                  setSelected(a);
                }}
              />
            ))}
          </div>
        </Modal>
      )}

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
