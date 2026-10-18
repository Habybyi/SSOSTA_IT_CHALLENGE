import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiPhone,
  FiMail,
  FiMapPin,
  FiUser,
  FiHome,
  FiClock,
  FiSliders,
  FiFileText,
  FiEdit2,
  FiSave,
  FiX,
  FiBarChart2,
  FiCalendar,
  FiPlus,
} from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { InfoItem } from "../components/InfoItem";
import { PriorityBadge, StatusBadge } from "../components/RequestCard";
import { ScheduleForm } from "../components/ScheduleForm";
import { AppointmentModal } from "../components/AppointmentModal";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import {
  APPOINTMENT_STATUS_LABELS,
  NOTIFICATION_LABELS,
  NOTIFICATION_STATUS_LABELS,
  PAYLOAD_LABELS,
  PRIORITY_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  SOURCE_LABELS,
  WATER_SOURCE_LABELS,
} from "../utils/labels";
import { capitalize, formatDateTime, formatDayLong, formatTime, fullName, gardenAddress, mapsUrl, timeAgo, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

// Ďalšie logické kroky podľa aktuálneho stavu, aby Milan nemusel premýšľať nad zoznamom stavov.
const NEXT_STEPS = {
  NEW: [
    { status: "SCHEDULED", label: "Naplánované" },
    { status: "IN_PROGRESS", label: "Začať riešiť" },
    { status: "CANCELLED", label: "Zrušiť", danger: true },
  ],
  SCHEDULED: [
    { status: "IN_PROGRESS", label: "Začať riešiť" },
    { status: "DONE", label: "Hotovo", primary: true },
    { status: "CANCELLED", label: "Zrušiť", danger: true },
  ],
  IN_PROGRESS: [
    { status: "DONE", label: "Hotovo", primary: true },
    { status: "SCHEDULED", label: "Treba ďalší termín" },
  ],
  DONE: [
    { status: "CLOSED", label: "Uzavrieť" },
    { status: "IN_PROGRESS", label: "Znova otvoriť" },
  ],
  CLOSED: [{ status: "IN_PROGRESS", label: "Znova otvoriť" }],
  CANCELLED: [{ status: "NEW", label: "Obnoviť" }],
};

const formatPayloadValue = (key, value) => {
  if (typeof value === "boolean") return value ? "Áno" : "Nie";
  if (key === "waterSource") return WATER_SOURCE_LABELS[value] || value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const RequestDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [request, setRequest] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [note, setNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [isEditingText, setIsEditingText] = useState(false);
  const [textForm, setTextForm] = useState({ title: "", description: "" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [openAppointment, setOpenAppointment] = useState(null);
  const [durations, setDurations] = useState(null);

  useEffect(() => {
    api.getScheduleSettings(token).then((d) => setDurations(d.settings.durations)).catch(() => {});
  }, [token]);

  const load = useCallback(() => {
    api
      .getRequest(token, id)
      .then((d) => setRequest(d.request))
      .catch((err) => setError(err.message));
  }, [token, id]);

  useEffect(() => {
    load();
    api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [load, token]);

  const run = async (action) => {
    setError("");
    setIsSaving(true);
    try {
      const data = await action();
      setRequest(data.request);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatus = async (status) => {
    const ok = await run(() => api.changeRequestStatus(token, id, { status, note, notifyCustomer }));
    if (ok) setNote("");
  };

  const handleField = (field) => (e) => run(() => api.updateRequest(token, id, { [field]: e.target.value }));

  const handleSaveText = async () => {
    const ok = await run(() => api.updateRequest(token, id, textForm));
    if (ok) setIsEditingText(false);
  };

  if (!request) {
    return (
      <AppShell>
        {error ? <div className={styles.errorMessage}>{error}</div> : <p className={styles.muted}>Načítavam…</p>}
      </AppShell>
    );
  }

  const r = request;
  const steps = NEXT_STEPS[r.status] || [];
  // Známe polia kalkulačky v logickom poradí, neznáme na koniec.
  const payloadOrder = Object.keys(PAYLOAD_LABELS);
  const rank = (key) => (payloadOrder.includes(key) ? payloadOrder.indexOf(key) : payloadOrder.length);
  const payloadEntries = r.payload ? Object.entries(r.payload).sort(([a], [b]) => rank(a) - rank(b)) : [];

  // Jedna časová os: zmeny stavu aj odoslané e-maily.
  const timeline = [
    ...r.statusChanges.map((c) => ({ kind: "status", date: c.createdAt, ...c })),
    ...r.notifications.map((n) => ({ kind: "mail", date: n.createdAt, ...n })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <AppShell>
      <Link to="/requests" className={styles.backLink}>
        <FiArrowLeft /> Požiadavky
      </Link>

      <div className={styles.splitHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <span className={styles.muted}>#{r.number}</span> {r.title}
          </h1>
          <div className={styles.chipRow} style={{ marginTop: "0.5rem" }}>
            <StatusBadge status={r.status} />
            <PriorityBadge priority={r.priority} />
            <span className={styles.badge}>{REQUEST_TYPE_LABELS[r.type]}</span>
            <span className={styles.badge}>{SOURCE_LABELS[r.source]}</span>
          </div>
          <p className={styles.muted} style={{ margin: "0.5rem 0 0" }}>
            Prijaté {timeAgo(r.createdAt)} ({formatDateTime(r.createdAt)}){r.createdBy && `, zapísal ${r.createdBy.name}`}
          </p>
        </div>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <Section title="Ďalší krok" icon={FiSliders}>
        <div className={styles.inputWrapper} style={{ marginBottom: "1rem" }}>
          <input
            className={styles.input}
            placeholder="Poznámka k zmene (nepovinné), napr. vymenený ventil v zóne 2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className={styles.buttonRow}>
          {steps.map((s) => (
            <button
              key={s.status}
              type="button"
              disabled={isSaving}
              className={s.primary ? styles.primaryButtonInline : s.danger ? styles.dangerButton : styles.secondaryButton}
              onClick={() => handleStatus(s.status)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {steps.some((s) => s.status === "DONE") && r.customer.email && (
          <label className={styles.checkboxLabel} style={{ marginTop: "0.5rem" }}>
            <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
            Pri „Hotovo“ poslať zákazníkovi e-mail
          </label>
        )}

        <div className={styles.formRow} style={{ marginTop: "1.25rem" }}>
          <label className={styles.field}>
            <span className={styles.label}>Priorita</span>
            <span className={styles.inputWrapper}>
              <select className={styles.select} value={r.priority} onChange={handleField("priority")}>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Typ</span>
            <span className={styles.inputWrapper}>
              <select className={styles.select} value={r.type} onChange={handleField("type")}>
                {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Kto to vybaví</span>
            <span className={styles.inputWrapper}>
              <select className={styles.select} value={r.assignedTo?.id || ""} onChange={handleField("assignedToId")}>
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
      </Section>

      <Section
        title="Termín"
        icon={FiCalendar}
        actions={
          !isScheduling &&
          ["NEW", "SCHEDULED", "IN_PROGRESS"].includes(r.status) && (
            <button type="button" className={styles.secondaryButton} onClick={() => setIsScheduling(true)}>
              <FiPlus /> {r.appointments.length ? "Ďalší termín" : "Naplánovať"}
            </button>
          )
        }
      >
        {r.appointments.length > 0 && (
          <div className={styles.list} style={{ marginBottom: isScheduling ? "1.25rem" : 0 }}>
            {r.appointments.map((a) => (
              <button
                key={a.id}
                type="button"
                className={styles.listCard}
                style={{ border: "none", textAlign: "left", cursor: "pointer", font: "inherit" }}
                onClick={() => setOpenAppointment({ ...a, garden: { ...r.garden, customer: r.customer }, serviceRequest: r })}
              >
                <span className={styles.listCardMain}>
                  <span className={styles.listCardTitle}>
                    {capitalize(formatDayLong(toDayKey(a.startsAt)))}
                    {a.status === "RESERVED" ? ", čas treba potvrdiť" : `, ${formatTime(a.startsAt)} až ${formatTime(a.endsAt)}`}
                  </span>
                  <span className={styles.listCardMeta}>{a.technician ? a.technician.name : "bez technika"}</span>
                </span>
                <span className={a.status === "RESERVED" ? styles.badgeHigh : styles.badgeGreen}>
                  {APPOINTMENT_STATUS_LABELS[a.status]}
                </span>
              </button>
            ))}
          </div>
        )}
        {r.appointments.length === 0 && !isScheduling && <p className={styles.emptyState}>Zatiaľ bez termínu.</p>}
        {isScheduling &&
          (r.garden ? (
            <ScheduleForm
              request={r}
              defaultDuration={durations?.[r.type]}
              onSaved={() => {
                setIsScheduling(false);
                load();
              }}
              onCancel={() => setIsScheduling(false)}
            />
          ) : (
            <p className={styles.errorMessage}>Najprv doplň záhradu (adresu) zákazníka, termín potrebuje miesto.</p>
          ))}
      </Section>

      <Section
        title="Popis"
        icon={FiFileText}
        actions={
          !isEditingText && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setTextForm({ title: r.title, description: r.description || "" });
                setIsEditingText(true);
              }}
            >
              <FiEdit2 /> Upraviť
            </button>
          )
        }
      >
        {isEditingText ? (
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Názov</span>
              <span className={styles.inputWrapper}>
                <input className={styles.input} value={textForm.title} onChange={(e) => setTextForm((f) => ({ ...f, title: e.target.value }))} />
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Popis</span>
              <span className={styles.inputWrapper}>
                <textarea
                  className={styles.textarea}
                  value={textForm.description}
                  onChange={(e) => setTextForm((f) => ({ ...f, description: e.target.value }))}
                />
              </span>
            </label>
            <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsEditingText(false)}>
                <FiX /> Zrušiť
              </button>
              <button type="button" className={styles.primaryButtonInline} onClick={handleSaveText} disabled={isSaving}>
                <FiSave /> ULOŽIŤ
              </button>
            </div>
          </div>
        ) : (
          <p className={r.description ? styles.infoValue : styles.infoEmpty} style={{ whiteSpace: "pre-wrap" }}>
            {r.description || "Bez popisu."}
          </p>
        )}
      </Section>

      {payloadEntries.length > 0 && (
        <Section title="Výsledok z kalkulačky" icon={FiBarChart2}>
          <div className={styles.infoGrid}>
            {payloadEntries.map(([key, value]) => (
              <InfoItem key={key} label={PAYLOAD_LABELS[key] || key}>
                {formatPayloadValue(key, value)}
              </InfoItem>
            ))}
          </div>
          <p className={styles.muted} style={{ margin: "1rem 0 0" }}>
            Orientačný odhad z webu. Presnú ponuku pripravíš po obhliadke.
          </p>
        </Section>
      )}

      <Section title="Zákazník" icon={FiUser}>
        <div className={styles.listCard}>
          <Link to={`/customers/${r.customer.id}`} className={styles.listCardMain} style={{ color: "inherit", textDecoration: "none" }}>
            <span className={styles.listCardTitle}>
              {fullName(r.customer)}
              {r.customer.status === "LEAD" && <span className={styles.badgeBrand} style={{ marginLeft: "0.5rem" }}>nový dopyt</span>}
            </span>
            <span className={styles.listCardMeta}>{[r.customer.phone, r.customer.email].filter(Boolean).join(" · ")}</span>
          </Link>
          {r.customer.phone && (
            <a href={`tel:${r.customer.phone.replace(/\s/g, "")}`} className={styles.iconButton} title="Zavolať">
              <FiPhone />
            </a>
          )}
          {r.customer.email && (
            <a href={`mailto:${r.customer.email}?subject=${encodeURIComponent(`Požiadavka č. ${r.number}`)}`} className={styles.iconButton} title="E-mail">
              <FiMail />
            </a>
          )}
        </div>
      </Section>

      <Section title="Záhrada" icon={FiHome}>
        {r.garden ? (
          <div className={styles.listCard}>
            <Link to={`/gardens/${r.garden.id}`} className={styles.listCardMain} style={{ color: "inherit", textDecoration: "none" }}>
              <span className={styles.listCardTitle}>Technická karta: {r.garden.label}</span>
              <span className={styles.listCardMeta}>
                {gardenAddress(r.garden)} · {r.garden._count.zones} zón
                {r.garden.installedYear ? ` · od ${r.garden.installedYear}` : ""}
              </span>
            </Link>
            <a href={mapsUrl(r.garden)} target="_blank" rel="noreferrer" className={styles.iconButton} title="Navigovať">
              <FiMapPin />
            </a>
          </div>
        ) : (
          <p className={styles.emptyState}>
            Požiadavka nemá priradenú záhradu.{" "}
            <Link to={`/customers/${r.customer.id}`} className={styles.linkButton}>
              Doplniť cez zákazníka
            </Link>
          </p>
        )}
      </Section>

      <Section title="História" icon={FiClock}>
        <div className={styles.timeline}>
          {timeline.map((item) =>
            item.kind === "status" ? (
              <div key={`s-${item.id}`} className={styles.timelineItem}>
                <span className={styles.timelineDate}>
                  {formatDateTime(item.date)}
                  {item.changedBy && ` · ${item.changedBy.name}`}
                </span>
                <span>
                  {item.fromStatus
                    ? `${REQUEST_STATUS_LABELS[item.fromStatus]} → ${REQUEST_STATUS_LABELS[item.toStatus]}`
                    : "Požiadavka prijatá"}
                </span>
                {item.note && <span className={styles.muted}>{item.note}</span>}
              </div>
            ) : (
              <div key={`m-${item.id}`} className={styles.timelineItem}>
                <span className={styles.timelineDate}>{formatDateTime(item.sentAt || item.date)}</span>
                <span>
                  <FiMail style={{ verticalAlign: "-2px" }} /> {NOTIFICATION_LABELS[item.template] || item.template} na {item.recipient}:{" "}
                  <strong>{NOTIFICATION_STATUS_LABELS[item.status]}</strong>
                </span>
              </div>
            )
          )}
        </div>
      </Section>
      {openAppointment && (
        <AppointmentModal
          appointment={openAppointment}
          onClose={() => setOpenAppointment(null)}
          onChanged={() => {
            setOpenAppointment(null);
            load();
          }}
        />
      )}
    </AppShell>
  );
};
