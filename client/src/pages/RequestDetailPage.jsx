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
import { Modal } from "../components/Modal";
import { PagedList } from "../components/PagedList";
import { TabBar, useTab } from "../components/Tabs";
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
  const tabs = [
    { key: "overview", label: "Prehľad", icon: FiSliders },
    { key: "description", label: "Popis", icon: FiFileText },
    { key: "schedule", label: "Termín", icon: FiCalendar, count: request?.appointments.length },
    { key: "customer", label: "Zákazník a záhrada", icon: FiUser },
    ...(request?.payload && Object.keys(request.payload).length ? [{ key: "calculator", label: "Kalkulačka", icon: FiBarChart2 }] : []),
    { key: "history", label: "História", icon: FiClock },
  ];
  const [tab, setTab] = useTab(tabs);

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

  const isOpen = ["NEW", "SCHEDULED", "IN_PROGRESS"].includes(r.status);
  const select = (label, value, onChange, options) => (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrapper}>
        <select className={styles.select} value={value} onChange={onChange}>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </span>
    </label>
  );

  return (
    <AppShell>
      <Link to="/requests" className={styles.backLink}>
        <FiArrowLeft /> Požiadavky
      </Link>

      <div className={styles.pageHeader}>
        <div style={{ minWidth: 0 }}>
          <h1 className={`${styles.pageTitle} ${styles.titleTruncate}`}>
            <span className={styles.muted}>#{r.number}</span> {r.title}
          </h1>
          <div className={styles.chipRow} style={{ marginTop: "0.4rem", alignItems: "center" }}>
            <StatusBadge status={r.status} />
            <PriorityBadge priority={r.priority} />
            <span className={styles.badge}>{REQUEST_TYPE_LABELS[r.type]}</span>
            <span className={styles.badge}>{SOURCE_LABELS[r.source]}</span>
            <span className={styles.muted}>
              prijaté {timeAgo(r.createdAt)}
              {r.createdBy && `, zapísal ${r.createdBy.name}`}
            </span>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div className={styles.tabPanel}>
        {tab === "overview" && (
          <Section title="Ďalší krok" icon={FiSliders}>
              <div className={styles.inputWrapper} style={{ marginBottom: "0.85rem" }}>
                <input
                  className={styles.input}
                  placeholder="Poznámka k zmene (nepovinné)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className={styles.buttonRow}>
                {steps.map((st) => (
                  <button
                    key={st.status}
                    type="button"
                    disabled={isSaving}
                    className={st.primary ? styles.primaryButtonInline : st.danger ? styles.dangerButton : styles.secondaryButton}
                    onClick={() => handleStatus(st.status)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              {steps.some((st) => st.status === "DONE") && r.customer.email && (
                <label className={styles.checkboxLabel} style={{ marginTop: "0.4rem" }}>
                  <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
                  Pri „Hotovo“ poslať zákazníkovi e-mail
                </label>
              )}
              <div className={styles.formRow} style={{ marginTop: "0.85rem" }}>
                {select("Priorita", r.priority, handleField("priority"), Object.entries(PRIORITY_LABELS))}
                {select("Typ", r.type, handleField("type"), Object.entries(REQUEST_TYPE_LABELS))}
                {select("Kto to vybaví", r.assignedTo?.id || "", handleField("assignedToId"), [["", "Zatiaľ nikto"], ...assignees.map((u) => [u.id, u.name])])}
              </div>
          </Section>
        )}

        {tab === "description" && (
            <Section
              title="Popis"
              icon={FiFileText}
              actions={
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
              }
            >
              <p className={r.description ? styles.infoValue : styles.infoEmpty} style={{ whiteSpace: "pre-wrap", maxHeight: "18rem", overflow: "hidden" }}>
                {r.description || "Bez popisu."}
              </p>
            </Section>
        )}

        {tab === "schedule" && (
          <section className={styles.panelFill}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FiCalendar /> Termíny
              </h2>
              {isOpen && (
                <button type="button" className={styles.primaryButtonInline} onClick={() => setIsScheduling(true)}>
                  <FiPlus /> {r.appointments.length ? "ĎALŠÍ TERMÍN" : "NAPLÁNOVAŤ"}
                </button>
              )}
            </div>
            {!r.garden && <p className={styles.errorMessage}>Najprv doplň záhradu (adresu) zákazníka, termín potrebuje miesto.</p>}
            <PagedList
              items={r.appointments}
              empty={<p className={styles.emptyState}>Zatiaľ bez termínu.</p>}
              renderItem={(a) => (
                <button
                  type="button"
                  className={`${styles.listCard} ${styles.fixedRow}`}
                  style={{ border: "none", textAlign: "left", cursor: "pointer", font: "inherit", width: "100%" }}
                  onClick={() => setOpenAppointment({ ...a, garden: { ...r.garden, customer: r.customer }, serviceRequest: r })}
                >
                  <span className={styles.listCardMain}>
                    <span className={styles.listCardTitle}>
                      {capitalize(formatDayLong(toDayKey(a.startsAt)))}
                      {a.status === "RESERVED" ? ", čas treba potvrdiť" : `, ${formatTime(a.startsAt)} až ${formatTime(a.endsAt)}`}
                    </span>
                    <span className={styles.listCardMeta}>{a.technician ? a.technician.name : "bez technika"}</span>
                  </span>
                  <span className={a.status === "RESERVED" ? styles.badgeHigh : styles.badgeGreen}>{APPOINTMENT_STATUS_LABELS[a.status]}</span>
                </button>
              )}
            />
          </section>
        )}

        {tab === "customer" && (
          <div className={styles.splitColumns} style={{ gridAutoRows: "min-content" }}>
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
          </div>
        )}

        {tab === "calculator" && (
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

        {tab === "history" && (
          <section className={styles.panelFill}>
            <PagedList
              items={[...timeline].reverse()}
              getKey={(item) => `${item.kind}-${item.id}`}
              renderItem={(item) =>
                item.kind === "status" ? (
                  <div className={`${styles.listCard} ${styles.fixedRow}`} title={item.note || undefined}>
                    <span className={styles.listCardMain}>
                      <span className={styles.listCardTitle}>
                        {item.fromStatus ? `${REQUEST_STATUS_LABELS[item.fromStatus]} → ${REQUEST_STATUS_LABELS[item.toStatus]}` : "Požiadavka prijatá"}
                        {item.note && <span className={styles.muted}> · {item.note}</span>}
                      </span>
                      <span className={styles.listCardMeta}>
                        {formatDateTime(item.date)}
                        {item.changedBy && ` · ${item.changedBy.name}`}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className={`${styles.listCard} ${styles.fixedRow}`}>
                    <FiMail style={{ flex: "none", color: "var(--neu-accent-dark)" }} />
                    <span className={styles.listCardMain}>
                      <span className={styles.listCardTitle}>
                        {NOTIFICATION_LABELS[item.template] || item.template} na {item.recipient}
                      </span>
                      <span className={styles.listCardMeta}>{formatDateTime(item.sentAt || item.date)}</span>
                    </span>
                    <span className={item.status === "SENT" ? styles.badgeGreen : styles.badge}>{NOTIFICATION_STATUS_LABELS[item.status]}</span>
                  </div>
                )
              }
            />
          </section>
        )}
      </div>

      {isEditingText && (
        <Modal title="Upraviť popis" onClose={() => setIsEditingText(false)}>
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
                <textarea className={styles.textarea} rows={6} value={textForm.description} onChange={(e) => setTextForm((f) => ({ ...f, description: e.target.value }))} />
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
        </Modal>
      )}

      {isScheduling && r.garden && (
        <Modal title="Naplánovať termín" wide onClose={() => setIsScheduling(false)}>
          <ScheduleForm
            request={r}
            defaultDuration={durations?.[r.type]}
            onSaved={() => {
              setIsScheduling(false);
              load();
            }}
            onCancel={() => setIsScheduling(false)}
          />
        </Modal>
      )}

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
