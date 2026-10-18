import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiSearch, FiChevronRight } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Pager } from "../components/Pager";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useDebouncedValue, useServerPaging } from "../hooks";
import { CUSTOMER_STATUS_LABELS } from "../utils/labels";
import { fullName, initials } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const STATUS_BADGE = { LEAD: styles.badgeBrand, ACTIVE: styles.badgeGreen, INACTIVE: styles.badgeMuted };

export const CustomersPage = () => {
  const { token } = useAuth();
  const listRef = useRef(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState([]);
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const { page, setPage, pageSize } = useServerPaging(listRef, `${debouncedQ}|${status}|${city}`);

  useEffect(() => {
    api.listCities(token).then((d) => setCities(d.cities)).catch(() => {});
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api
      .listCustomers(token, { q: debouncedQ, status, city, page, pageSize })
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, debouncedQ, status, city, page, pageSize]);

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Zákazníci</h1>
        <Link to="/customers/new" className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
          <FiPlus /> NOVÝ ZÁKAZNÍK
        </Link>
      </div>

      <div className={styles.toolbar}>
        <div className={`${styles.inputWrapper} ${styles.toolbarSearch}`}>
          <FiSearch />
          <input
            className={styles.input}
            placeholder="Hľadať meno, telefón, e-mail alebo adresu"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className={styles.inputWrapper} style={{ flex: "1 1 150px" }}>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Všetky stavy</option>
            {Object.entries(CUSTOMER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputWrapper} style={{ flex: "1 1 150px" }}>
          <select className={styles.select} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Všetky obce</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className={styles.fill}>
        <div ref={listRef} className={styles.viewport}>
          {!isLoading && data.items.length === 0 ? (
            <p className={styles.emptyState}>
              {q || status || city ? "Nikto nezodpovedá hľadaniu." : "Zatiaľ žiadni zákazníci. Pridaj prvého."}
            </p>
          ) : (
            data.items.map((c) => (
              <Link key={c.id} to={`/customers/${c.id}`} className={`${styles.listCard} ${styles.fixedRow}`}>
                <span className={styles.avatar}>{initials(c)}</span>
                <span className={styles.listCardMain}>
                  <span className={styles.listCardTitle}>
                    {fullName(c)}
                    {c.companyName && <span className={styles.muted}> · {c.companyName}</span>}
                  </span>
                  <span className={styles.listCardMeta}>
                    {[c.phone, c.gardens.map((g) => `${g.street}, ${g.city}`).join(" · ")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={styles.chipRow} style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                  {c.openRequests > 0 && <span className={styles.badgeBrand}>{c.openRequests} otvorené</span>}
                  <span className={STATUS_BADGE[c.status]}>{CUSTOMER_STATUS_LABELS[c.status]}</span>
                </span>
                <FiChevronRight style={{ flex: "none", color: "var(--neu-text-muted)" }} />
              </Link>
            ))
          )}
        </div>
        <Pager page={page} pageSize={pageSize} total={data.total} onChange={setPage} />
      </div>
    </AppShell>
  );
};
