import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMapPin, FiCalendar, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { PriorityBadge } from "../components/RequestCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { REQUEST_TYPE_LABELS } from "../utils/labels";
import { addDaysKey, capitalize, formatDayLong, formatDayShort, formatTime, fullName, timeAgo, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const SEASON_TYPES = ["WINTERIZATION", "SPRING_START", "LAWN_CARE", "FAULT", "INSPECTION", "INSTALLATION", "OTHER"];

// Jeseň = zazimovanie, jar = spustenie, inak starostlivosť o trávnik.
const defaultType = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 8 && month <= 12) return "WINTERIZATION";
  if (month >= 2 && month <= 5) return "SPRING_START";
  return "LAWN_CARE";
};

// Riešenie jarnej a jesennej špičky: požiadavky zoskupené podľa obce,
// Milan vyberie, kam ide v jeden deň, a systém rozloží časy za sebou.
export const PlannerPage = () => {
  const { token } = useAuth();
  const [type, setType] = useState(defaultType);
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [plan, setPlan] = useState({ date: addDaysKey(toDayKey(new Date()), 1), technicianId: "", startTime: "", notifyCustomer: true });
  const [dayInfo, setDayInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getPlanner(token, type)
      .then((d) => setGroups(d.groups))
      .catch((err) => setError(err.message));
  }, [token, type]);

  useEffect(() => {
    load();
    setSelected([]);
  }, [load]);

  useEffect(() => {
    api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [token]);

  useEffect(() => {
    api.getCapacity(token, plan.date, plan.date).then((d) => setDayInfo(d.days[0])).catch(() => setDayInfo(null));
  }, [token, plan.date, result]);

  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleCity = (group) => {
    const ids = group.items.filter((i) => i.garden).map((i) => i.id);
    const allOn = ids.every((id) => selected.includes(id));
    setSelected((s) => (allOn ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]));
  };

  const handlePlan = async () => {
    setError("");
    setResult(null);
    setIsSaving(true);
    try {
      // Poradie = poradie v zozname (zoradené podľa obce a ulice), teda rozumná trasa.
      const requestIds = allItems.filter((i) => selected.includes(i.id)).map((i) => i.id);
      const data = await api.planDay(token, { ...plan, startTime: plan.startTime || undefined, requestIds });
      setResult(data);
      setSelected([]);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <Link to="/calendar" className={styles.backLink}>
        <FiArrowLeft /> Kalendár
      </Link>
      <h1 className={styles.pageTitle} style={{ marginBottom: "0.4rem" }}>Plánovač sezóny</h1>
      <p className={styles.muted} style={{ margin: "0 0 1.25rem" }}>
        Vyber požiadavky z jednej alebo susedných obcí a naplánuj ich na jeden deň. Časy sa rozložia za sebou aj s presunom.
      </p>

      <div className={styles.tabs}>
        {SEASON_TYPES.map((t) => (
          <button key={t} type="button" className={type === t ? styles.tabActive : styles.tab} onClick={() => setType(t)}>
            {REQUEST_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className={styles.plannerLayout}>
        <div>
          {groups.length === 0 ? (
            <p className={styles.emptyState}>Žiadne nenaplánované požiadavky tohto typu.</p>
          ) : (
            groups.map((group) => {
              const plannable = group.items.filter((i) => i.garden);
              const allOn = plannable.length > 0 && plannable.every((i) => selected.includes(i.id));
              return (
                <section key={group.city} className={styles.cityGroup}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      <FiMapPin /> {group.city} <span className={styles.count}>{group.items.length}</span>
                    </h2>
                    {plannable.length > 0 && (
                      <button type="button" className={styles.linkButton} onClick={() => toggleCity(group)}>
                        {allOn ? "Odznačiť obec" : "Vybrať celú obec"}
                      </button>
                    )}
                  </div>
                  {group.items.map((item) => (
                    <label key={item.id} className={styles.checkRow} style={item.garden ? undefined : { opacity: 0.55, cursor: "not-allowed" }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggle(item.id)}
                        disabled={!item.garden}
                      />
                      <span className={styles.listCardMain}>
                        <span style={{ fontWeight: 600 }}>
                          {fullName(item.customer)}
                          <span className={styles.muted}> · #{item.number}</span>
                        </span>
                        <span className={styles.listCardMeta}>
                          {item.garden ? `${item.garden.street} · ${item.garden._count.zones} zón` : "chýba záhrada, doplň ju v požiadavke"} ·
                          prijaté {timeAgo(item.createdAt)}
                        </span>
                      </span>
                      <span className={styles.chipRow}>
                        <PriorityBadge priority={item.priority} />
                        {item.reservedFor && <span className={styles.badgeHigh}>chce {formatDayShort(item.reservedFor)}</span>}
                      </span>
                    </label>
                  ))}
                </section>
              );
            })
          )}
        </div>

        <aside className={styles.stickyPanel}>
          <h2 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>
            <FiCalendar /> Naplánovať deň
          </h2>
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Deň</span>
              <span className={styles.inputWrapper}>
                <input type="date" className={styles.input} value={plan.date} onChange={(e) => setPlan((p) => ({ ...p, date: e.target.value }))} />
              </span>
            </label>
            {dayInfo && (
              <span className={dayInfo.free > 0 ? styles.muted : styles.fieldError}>
                {capitalize(formatDayLong(plan.date))}:{" "}
                {dayInfo.max === 0 ? "nepracovný deň" : `voľné ${dayInfo.free} z ${dayInfo.max} výjazdov`}
              </span>
            )}
            <label className={styles.field}>
              <span className={styles.label}>Technik</span>
              <span className={styles.inputWrapper}>
                <select className={styles.select} value={plan.technicianId} onChange={(e) => setPlan((p) => ({ ...p, technicianId: e.target.value }))}>
                  <option value="">Zatiaľ nikto</option>
                  {assignees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Začať o (prázdne = začiatok pracovného dňa)</span>
              <span className={styles.inputWrapper}>
                <input type="time" step="900" className={styles.input} value={plan.startTime} onChange={(e) => setPlan((p) => ({ ...p, startTime: e.target.value }))} />
              </span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={plan.notifyCustomer} onChange={(e) => setPlan((p) => ({ ...p, notifyCustomer: e.target.checked }))} />
              Poslať zákazníkom e-mail s časom
            </label>
            <button type="button" className={styles.primaryButton} disabled={!selected.length || isSaving} onClick={handlePlan}>
              {isSaving ? "PLÁNUJEM…" : `NAPLÁNOVAŤ VYBRANÉ (${selected.length})`}
            </button>
            {error && <div className={styles.errorMessage}>{error}</div>}

            {result && (
              <div className={styles.calloutBox}>
                {result.planned.length > 0 && (
                  <>
                    <strong>
                      <FiCheckCircle style={{ verticalAlign: "-2px" }} /> Naplánované: {result.planned.length}
                    </strong>
                    <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
                      {result.planned.map((p) => (
                        <li key={p.appointmentId}>
                          {formatTime(p.startsAt)} až {formatTime(p.endsAt)}: #{p.number}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {result.skipped.length > 0 && (
                  <div style={{ marginTop: "0.6rem", color: "var(--neu-warning)" }}>
                    <strong>
                      <FiAlertCircle style={{ verticalAlign: "-2px" }} /> Preskočené: {result.skipped.length}
                    </strong>
                    <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
                      {result.skipped.map((s) => (
                        <li key={s.requestId}>
                          #{s.number}: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link to={`/calendar?week=${plan.date}`} className={styles.linkButton} style={{ marginTop: "0.6rem" }}>
                  Otvoriť v kalendári
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
};
