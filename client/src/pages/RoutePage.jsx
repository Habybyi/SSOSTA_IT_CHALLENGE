import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiChevronLeft, FiChevronRight, FiNavigation } from "react-icons/fi";
import { Marker, Polyline, Popup } from "react-leaflet";
import { AppShell } from "../components/AppShell";
import { PagedList } from "../components/PagedList";
import { BaseMap, FitBounds, hasGps, navigationUrl, numberIcon } from "../components/MapParts";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { REQUEST_TYPE_LABELS } from "../utils/labels";
import { addDaysKey, formatDayLong, formatTime, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const whatToDo = (a) => (a.serviceRequest ? `#${a.serviceRequest.number} ${REQUEST_TYPE_LABELS[a.serviceRequest.type]}` : a.notes || "Výjazd");

// Trasa dňa: výjazdy v poradí podľa času na mape. Brigádnik vidí len svoje.
export const RoutePage = () => {
  const { token, user } = useAuth();
  const isOwner = user.role === "OWNER";
  const [searchParams, setSearchParams] = useSearchParams();
  const day = searchParams.get("day") || toDayKey(new Date());

  const [technicianId, setTechnicianId] = useState(isOwner ? "" : user.id);
  const [assignees, setAssignees] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOwner) api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [token, isOwner]);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await api.listAppointments(token, day, day, technicianId || undefined);
      setAppointments(data.appointments);
    } catch (err) {
      setError(err.message);
    }
  }, [token, day, technicianId]);

  useEffect(() => {
    load();
  }, [load]);

  const stops = appointments.map((a, i) => ({ ...a, order: i + 1 }));
  const onMap = stops.filter((a) => hasGps(a.garden));
  const points = onMap.map((a) => [a.garden.latitude, a.garden.longitude]);
  const missingGps = stops.length - onMap.length;

  const StopRow = ({ a }) => (
    <div className={`${styles.listCard} ${styles.fixedRow}`}>
      <span className={a.status === "DONE" ? styles.mapPinDone : styles.mapPin} style={{ flex: "none" }}>
        {a.order}
      </span>
      <span className={styles.listCardMain}>
        <span className={styles.listCardTitle}>
          {a.status === "RESERVED" ? "čas ?" : formatTime(a.startsAt)} · {a.garden.customer.firstName} {a.garden.customer.lastName}
        </span>
        <span className={styles.listCardMeta}>
          {a.garden.street}, {a.garden.city} · {whatToDo(a)}
          {!hasGps(a.garden) && " · bez GPS"}
        </span>
      </span>
      <a className={styles.iconButton} href={navigationUrl(a.garden)} target="_blank" rel="noreferrer" title="Navigovať">
        <FiNavigation />
      </a>
    </div>
  );

  return (
    <AppShell>
      <Link to="/calendar" className={styles.backLink}>
        <FiArrowLeft /> Kalendár
      </Link>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Trasa dňa</h1>
        <div className={styles.buttonRow} style={{ alignItems: "center" }}>
          <button type="button" className={styles.iconButton} onClick={() => setSearchParams({ day: addDaysKey(day, -1) })} title="Predchádzajúci deň">
            <FiChevronLeft />
          </button>
          <button type="button" className={styles.secondaryButton} onClick={() => setSearchParams({})}>
            Dnes
          </button>
          <button type="button" className={styles.iconButton} onClick={() => setSearchParams({ day: addDaysKey(day, 1) })} title="Ďalší deň">
            <FiChevronRight />
          </button>
          <strong style={{ color: "var(--neu-text)", marginLeft: "0.5rem" }}>{formatDayLong(day)}</strong>
        </div>
      </div>

      {isOwner && (
        <div className={styles.toolbar}>
          <div className={styles.inputWrapper} style={{ flex: "0 1 260px" }}>
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
      )}

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className={styles.routeLayout}>
        <section className={styles.panelFill}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{stops.length} výjazdov</h2>
            {missingGps > 0 && <span className={styles.badgeHigh}>{missingGps} bez GPS</span>}
          </div>
          <PagedList
            items={stops}
            rowHeight={76}
            empty={<p className={styles.emptyState}>V tento deň nie sú výjazdy.</p>}
            renderItem={(a) => <StopRow a={a} />}
          />
        </section>

        <div className={styles.mapPanel}>
          <BaseMap>
            <FitBounds points={points} />
            {points.length > 1 && <Polyline positions={points} pathOptions={{ color: "#28861c", weight: 4, opacity: 0.7, dashArray: "8 8" }} />}
            {onMap.map((a) => (
              <Marker key={a.id} position={[a.garden.latitude, a.garden.longitude]} icon={numberIcon(a.order, a.status === "DONE" ? "done" : "default")}>
                <Popup>
                  <strong>
                    {a.order}. {a.status === "RESERVED" ? "čas ?" : formatTime(a.startsAt)} · {a.garden.customer.firstName} {a.garden.customer.lastName}
                  </strong>
                  <br />
                  {a.garden.street}, {a.garden.city}
                  <br />
                  {whatToDo(a)}
                  {a.technician && (
                    <>
                      <br />
                      Technik: {a.technician.name}
                    </>
                  )}
                  <br />
                  <a href={navigationUrl(a.garden)} target="_blank" rel="noreferrer">
                    Navigovať
                  </a>
                  {" · "}
                  <Link to={`/visits/${a.id}`}>Otvoriť výjazd</Link>
                </Popup>
              </Marker>
            ))}
          </BaseMap>
        </div>
      </div>
    </AppShell>
  );
};
