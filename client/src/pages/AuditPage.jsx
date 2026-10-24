import { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { PagedList } from "../components/PagedList";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "../utils/labels";
import { formatDateTime } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const WARNING_ACTIONS = ["LOGIN_FAILED", "PASSWORD_RESET", "CUSTOMER_DELETED", "CUSTOMER_ANONYMIZED", "USER_UPDATED"];

const describeDetails = (details) => {
  if (!details || typeof details !== "object") return "";
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`)
    .join(", ");
};

export const AuditPage = () => {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await api.listAudit(token, { pageSize: 100 });
      setEntries(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [token]);

  const EntryRow = ({ entry }) => {
    const details = describeDetails(entry.details);
    const who = entry.user?.name || entry.details?.email || "Systém";
    return (
      <div className={`${styles.listCard} ${styles.fixedRow}`}>
        <span className={styles.listCardMain}>
          <span className={styles.listCardTitle}>
            {AUDIT_ACTION_LABELS[entry.action] || entry.action}
          </span>
          <span className={styles.listCardMeta}>
            {formatDateTime(entry.createdAt)} · {who} · {AUDIT_ENTITY_LABELS[entry.entityType] || entry.entityType}
            {details && ` · ${details}`}
          </span>
        </span>
        {WARNING_ACTIONS.includes(entry.action) && <span className={styles.badgeBrand}>Pozor</span>}
      </div>
    );
  };

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Logy</h1>
        <button type="button" className={styles.secondaryButton} onClick={load} disabled={isLoading}>
          <FiRefreshCw /> {isLoading ? "NAČÍTAVAM…" : "OBNOVIŤ"}
        </button>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <PagedList
        items={entries}
        renderItem={(entry) => <EntryRow entry={entry} />}
        empty={<p className={styles.emptyState}>Zatiaľ žiadne záznamy.</p>}
      />
    </AppShell>
  );
};
