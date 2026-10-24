import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiCalendar, FiClock, FiDownload, FiHome, FiInbox, FiLock, FiSettings, FiActivity } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { Modal } from "../components/Modal";
import { PagedList } from "../components/PagedList";
import { TabBar, useTab } from "../components/Tabs";
import { CheckboxField, SelectField, TextAreaField } from "../components/FormFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { DEVICE_TYPE_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS, toOptions } from "../utils/labels";
import { capitalize, formatDate, formatDateTime, formatDayLong, formatTime, gardenAddress, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const EMPTY_REQUEST = { gardenId: "", type: "FAULT", description: "", isUrgent: false };

const DEVICE_BADGE = {
  ok: { className: styles.badgeGreen, label: "OK" },
  warning: { className: styles.badgeHigh, label: "Pozor" },
  alert: { className: styles.badgeEmergency, label: "Poplach" },
  offline: { className: styles.badgeMuted, label: "Offline" },
  waiting: { className: styles.badgeMuted, label: "Čaká na dáta" },
};

const statusBadge = (status) =>
  status === "NEW" ? styles.badgeBrand : status === "DONE" || status === "CLOSED" ? styles.badgeGreen : status === "CANCELLED" ? styles.badgeMuted : styles.badge;

const NewRequestModal = ({ gardens, onClose, onCreated }) => {
  const { token } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_REQUEST, gardenId: gardens[0]?.id || "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const props = { form, setForm, errors };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setIsSaving(true);
    try {
      const data = await api.portalCreateRequest(token, form);
      onCreated(data.request.number);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      setIsSaving(false);
    }
  };

  return (
    <Modal title="Nahlásiť problém alebo objednať servis" onClose={onClose}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {gardens.length > 1 && (
          <SelectField name="gardenId" label="Ktorá záhrada" options={gardens.map((g) => ({ value: g.id, label: `${g.label}, ${g.street}` }))} {...props} />
        )}
        <SelectField name="type" label="S čím potrebujete pomôcť" options={toOptions(REQUEST_TYPE_LABELS)} {...props} />
        <TextAreaField name="description" label="Čo sa deje" rows={4} placeholder="Napr. zóna pri terase nestrieka, z trávnika tečie voda…" {...props} autoFocus />
        <CheckboxField name="isUrgent" label="Je to naliehavé (tečie voda, hrozí škoda)" {...props} />
        {error && <div className={styles.errorMessage}>{error}</div>}
        <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Zrušiť
          </button>
          <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
            {isSaving ? "ODOSIELAM…" : "ODOSLAŤ"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const PortalPage = () => {
  const { token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const tabs = [
    { key: "overview", label: "Prehľad", icon: FiHome },
    { key: "requests", label: "Moje požiadavky", icon: FiInbox, count: overview?.openRequests },
    { key: "history", label: "História servisu", icon: FiClock },
    { key: "settings", label: "Nastavenia a údaje", icon: FiSettings },
  ];
  const [tab, setTab] = useTab(tabs);

  const load = useCallback(async () => {
    try {
      const [o, r, h] = await Promise.all([
        api.portalOverview(token),
        api.portalRequests(token, { pageSize: 100 }),
        api.portalHistory(token, { pageSize: 100 }),
      ]);
      setOverview(o);
      setRequests(r.items);
      setHistory(h.items);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const savePreference = async (name, value) => {
    setOverview((o) => ({ ...o, customer: { ...o.customer, [name]: value } }));
    try {
      await api.portalPreferences(token, { [name]: value });
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.portalExport(token);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "moje-udaje-custodia.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!overview) {
    return (
      <AppShell>
        {error ? <div className={styles.errorMessage}>{error}</div> : <p className={styles.muted}>Načítavam…</p>}
      </AppShell>
    );
  }

  const { customer, gardens, appointments } = overview;
  const gardenRows = gardens.flatMap((g) => [{ kind: "garden", id: g.id, garden: g }, ...g.devices.map((d) => ({ kind: "device", id: d.id, device: d }))]);
  const problems = gardens.flatMap((g) => g.devices.filter((d) => d.status.level === "alert" || d.status.level === "warning"));

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dobrý deň, {customer.firstName}</h1>
        <button type="button" className={styles.primaryButtonInline} onClick={() => setIsAdding(true)}>
          <FiAlertTriangle /> NAHLÁSIŤ PROBLÉM / OBJEDNAŤ SERVIS
        </button>
      </div>

      {notice && <div className={styles.calloutBox} style={{ marginBottom: "0.75rem", flex: "none" }}>{notice}</div>}
      {problems.map((d) => (
        <div key={d.id} className={d.status.level === "alert" ? styles.calloutAlert : styles.calloutWarning} style={{ marginBottom: "0.6rem", flex: "none" }}>
          <strong>{d.name}:</strong> {d.status.message}
        </div>
      ))}
      {error && <div className={styles.errorMessage} style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div className={styles.tabPanel}>
        {tab === "overview" && (
          <div className={styles.splitColumns}>
            <section className={styles.panelFill}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <FiCalendar /> Najbližšie termíny
                </h2>
              </div>
              <PagedList
                items={appointments}
                empty={<p className={styles.emptyState}>Zatiaľ nemáte naplánovaný žiadny termín.</p>}
                renderItem={(a) => (
                  <div className={`${styles.listCard} ${styles.fixedRow}`}>
                    <span className={styles.listCardMain}>
                      <span className={styles.listCardTitle}>
                        {capitalize(formatDayLong(toDayKey(a.startsAt)))}
                        {a.status === "RESERVED" ? ", čas vám potvrdíme" : `, ${formatTime(a.startsAt)} až ${formatTime(a.endsAt)}`}
                      </span>
                      <span className={styles.listCardMeta}>
                        {a.serviceRequest ? REQUEST_TYPE_LABELS[a.serviceRequest.type] : "Servis"} · {a.garden.street}
                        {a.technician && ` · technik ${a.technician.name.split(" ")[0]}`}
                      </span>
                    </span>
                    {a.status === "RESERVED" && <span className={styles.badgeHigh}>čaká na potvrdenie</span>}
                  </div>
                )}
              />
            </section>

            <section className={styles.panelFill}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <FiActivity /> Moje záhrady a senzory
                </h2>
              </div>
              <PagedList
                items={gardenRows}
                rowHeight={72}
                empty={<p className={styles.emptyState}>Zatiaľ tu nie je žiadna záhrada.</p>}
                renderItem={(row) =>
                  row.kind === "garden" ? (
                    <div className={`${styles.listCard} ${styles.fixedRow}`}>
                      <span className={styles.listCardMain}>
                        <span className={styles.listCardTitle}>{row.garden.label}</span>
                        <span className={styles.listCardMeta}>
                          {gardenAddress(row.garden)} · {row.garden._count.zones} zón
                          {row.garden.installedYear && ` · systém z roku ${row.garden.installedYear}`}
                        </span>
                      </span>
                      {row.garden.isSmartController && <span className={styles.badgeBrand}>smart</span>}
                    </div>
                  ) : (
                    <div className={`${styles.listCard} ${styles.fixedRow}`} style={{ marginLeft: "1.25rem" }} title={row.device.status.message || undefined}>
                      <span className={styles.listCardMain}>
                        <span className={styles.listCardTitle}>{row.device.name}</span>
                        <span className={styles.listCardMeta}>
                          {DEVICE_TYPE_LABELS[row.device.type]}
                          {row.device.lastSeenAt && ` · ${formatDateTime(row.device.lastSeenAt)}`}
                        </span>
                      </span>
                      <strong className={styles.iotValue}>{row.device.display || "–"}</strong>
                      <span className={DEVICE_BADGE[row.device.status.level].className}>{DEVICE_BADGE[row.device.status.level].label}</span>
                    </div>
                  )
                }
              />
            </section>
          </div>
        )}

        {tab === "requests" && (
          <section className={styles.panelFill}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FiInbox /> Moje požiadavky
              </h2>
            </div>
            <PagedList
              items={requests}
              empty={<p className={styles.emptyState}>Zatiaľ ste nám neposlali žiadnu požiadavku.</p>}
              renderItem={(r) => (
                <div className={`${styles.listCard} ${styles.fixedRow}`}>
                  <span className={styles.listCardMain}>
                    <span className={styles.listCardTitle}>
                      #{r.number} {REQUEST_TYPE_LABELS[r.type]}
                      {r.title && r.title !== REQUEST_TYPE_LABELS[r.type] && <span className={styles.muted}> · {r.title}</span>}
                    </span>
                    <span className={styles.listCardMeta}>
                      prijatá {formatDate(r.createdAt)}
                      {r.garden && ` · ${r.garden.street}`}
                      {r.appointments[0] &&
                        ` · termín ${formatDate(r.appointments[0].startsAt)}${r.appointments[0].status === "RESERVED" ? " (čas potvrdíme)" : ` o ${formatTime(r.appointments[0].startsAt)}`}`}
                    </span>
                  </span>
                  {r.priority === "HIGH" || r.priority === "EMERGENCY" ? <span className={styles.badgeHigh}>naliehavé</span> : null}
                  <span className={statusBadge(r.status)}>{REQUEST_STATUS_LABELS[r.status]}</span>
                </div>
              )}
            />
          </section>
        )}

        {tab === "history" && (
          <section className={styles.panelFill}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <FiClock /> Čo sme u vás robili
              </h2>
            </div>
            <PagedList
              items={history}
              empty={<p className={styles.emptyState}>Zatiaľ tu nie je žiadny záznam.</p>}
              renderItem={(w) => (
                <div className={`${styles.listCard} ${styles.fixedRow}`}>
                  <span className={styles.listCardMain}>
                    <span className={styles.listCardTitle}>{w.description}</span>
                    <span className={styles.listCardMeta}>
                      {formatDate(w.performedAt)} · {w.garden.street}
                      {w.technician && ` · ${w.technician.name}`}
                      {w.durationMin && ` · ${w.durationMin} min`}
                    </span>
                  </span>
                </div>
              )}
            />
          </section>
        )}

        {tab === "settings" && (
          <Section title="Nastavenia a moje údaje" icon={FiSettings}>
            <div className={styles.infoGrid}>
              <div>
                <strong>{[customer.firstName, customer.lastName].join(" ")}</strong>
                {customer.companyName && <div className={styles.muted}>{customer.companyName}</div>}
                <div className={styles.muted}>{customer.email}</div>
                <div className={styles.muted}>{customer.phone}</div>
              </div>
            </div>
            <p className={styles.muted}>Ak sa zmenili vaše kontaktné údaje, napíšte nám cez „Nahlásiť problém“ (typ Iné) a upravíme ich.</p>
            <div className={styles.chipRow} style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.6rem" }}>
              <CheckboxField
                name="serviceReminders"
                label="Posielať mi servisné pripomienky (zazimovanie, jarné spustenie, termín zajtra)"
                form={customer}
                setForm={(update) => savePreference("serviceReminders", update(customer).serviceReminders)}
              />
              <CheckboxField
                name="marketingConsent"
                label="Súhlasím so zasielaním noviniek a akcií"
                form={customer}
                setForm={(update) => savePreference("marketingConsent", update(customer).marketingConsent)}
              />
            </div>
            <div className={styles.buttonRow} style={{ marginTop: "1.25rem" }}>
              <button type="button" className={styles.secondaryButton} onClick={handleExport} title="Export všetkých údajov (GDPR čl. 15 a 20)">
                <FiDownload /> Stiahnuť moje údaje (GDPR)
              </button>
              <Link to="/change-password" className={styles.secondaryButton} style={{ textDecoration: "none" }}>
                <FiLock /> Zmeniť heslo
              </Link>
            </div>
          </Section>
        )}
      </div>

      {isAdding && (
        <NewRequestModal
          gardens={gardens}
          onClose={() => setIsAdding(false)}
          onCreated={(number) => {
            setIsAdding(false);
            setNotice(`Ďakujeme, požiadavku č. ${number} sme prijali. Potvrdenie sme vám poslali e-mailom a čoskoro sa ozveme.`);
            setTab("requests");
            load();
          }}
        />
      )}
    </AppShell>
  );
};
