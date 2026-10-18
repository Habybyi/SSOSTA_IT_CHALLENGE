import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { PRIORITY_LABELS } from "../utils/labels";
import { addDaysKey, capitalize, fromDayKey, mondayOf, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const WEEKDAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const MAX_DOTS = 3;
// Bodky v poradí dôležitosti: havárie vždy viditeľné.
const PRIORITY_ORDER = { EMERGENCY: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

// Mesačný kalendár: bodka = výjazd vo farbe priority, klik na deň otvorí týždeň v Kalendári.
export const MonthCalendar = ({ technicianId }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const today = toDayKey(new Date());
  const [month, setMonth] = useState(() => today.slice(0, 7)); // "RRRR-MM"
  const [appointments, setAppointments] = useState([]);

  // Mriežka vždy od pondelka do nedele (5 alebo 6 týždňov).
  const days = useMemo(() => {
    const first = `${month}-01`;
    const start = mondayOf(first);
    const lastOfMonth = toDayKey(new Date(fromDayKey(first).getFullYear(), fromDayKey(first).getMonth() + 1, 0));
    const end = addDaysKey(mondayOf(lastOfMonth), 6);
    const list = [];
    for (let d = start; d <= end; d = addDaysKey(d, 1)) list.push(d);
    return list;
  }, [month]);

  useEffect(() => {
    api
      .listAppointments(token, days[0], days[days.length - 1], technicianId)
      .then((d) => setAppointments(d.appointments))
      .catch(() => setAppointments([]));
  }, [token, days, technicianId]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const a of appointments) {
      const key = toDayKey(a.startsAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    for (const list of map.values()) {
      list.sort((x, y) => PRIORITY_ORDER[x.serviceRequest?.priority || "NORMAL"] - PRIORITY_ORDER[y.serviceRequest?.priority || "NORMAL"]);
    }
    return map;
  }, [appointments]);

  const shiftMonth = (offset) => {
    const d = fromDayKey(`${month}-01`);
    d.setMonth(d.getMonth() + offset);
    setMonth(toDayKey(d).slice(0, 7));
  };

  const title = capitalize(fromDayKey(`${month}-01`).toLocaleDateString("sk-SK", { month: "long", year: "numeric" }));

  return (
    <>
      <div className={styles.monthHeader}>
        <h2 className={styles.sectionTitle}>
          <FiCalendar /> {title}
        </h2>
        <div className={styles.buttonRow}>
          <button type="button" className={styles.iconButton} onClick={() => shiftMonth(-1)} title="Predchádzajúci mesiac">
            <FiChevronLeft />
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => setMonth(today.slice(0, 7))}>
            Dnes
          </button>
          <button type="button" className={styles.iconButton} onClick={() => shiftMonth(1)} title="Ďalší mesiac">
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className={styles.monthGrid} style={{ gridTemplateRows: `auto repeat(${days.length / 7}, minmax(0, 1fr))` }}>
        {WEEKDAYS.map((d) => (
          <span key={d} className={styles.monthWeekday}>
            {d}
          </span>
        ))}
        {days.map((day) => {
          const items = byDay.get(day) || [];
          const cls = day === today ? styles.monthDayToday : day.slice(0, 7) !== month ? styles.monthDayOther : styles.monthDay;
          return (
            <button
              key={day}
              type="button"
              className={cls}
              onClick={() => navigate(`/calendar?week=${day}`)}
              title={items.length ? `${items.length} ${items.length === 1 ? "výjazd" : items.length < 5 ? "výjazdy" : "výjazdov"}` : "Bez výjazdov"}
            >
              <span className={styles.monthDayNumber}>{Number(day.slice(8))}</span>
              <span className={styles.dotRow}>
                {items.slice(0, MAX_DOTS).map((a) => (
                  <span
                    key={a.id}
                    className={`${styles.dot} ${a.status === "RESERVED" ? styles.dotReserved : styles[`dot${a.serviceRequest?.priority || "NORMAL"}`]}`}
                  />
                ))}
                {items.length > MAX_DOTS && <span className={styles.dotMore}>+{items.length - MAX_DOTS}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        {["EMERGENCY", "HIGH", "NORMAL", "LOW"].map((p) => (
          <span key={p} className={styles.legendItem}>
            <span className={`${styles.dot} ${styles[`dot${p}`]}`} /> {PRIORITY_LABELS[p]}
          </span>
        ))}
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotReserved}`} /> Rezervácia
        </span>
      </div>
    </>
  );
};
