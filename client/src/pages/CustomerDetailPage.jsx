import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit2,
  FiPhone,
  FiMail,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiUser,
  FiHome,
  FiInbox,
  FiChevronRight,
} from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { InfoItem } from "../components/InfoItem";
import { RequestCard } from "../components/RequestCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import {
  CONTACT_LABELS,
  CUSTOMER_STATUS_LABELS,
  SOURCE_LABELS,
  WATER_SOURCE_LABELS,
} from "../utils/labels";
import { formatDate, fullName, gardenAddress, mapsUrl } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

export const CustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .getCustomer(token, id)
      .then((d) => setCustomer(d.customer))
      .catch((err) => setError(err.message));
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!window.confirm(`Naozaj odstrániť zákazníka ${fullName(customer)}? História zostane uložená.`)) return;
    try {
      await api.deleteCustomer(token, id);
      navigate("/customers");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!customer) {
    return (
      <AppShell>
        {error ? <div className={styles.errorMessage}>{error}</div> : <p className={styles.muted}>Načítavam…</p>}
      </AppShell>
    );
  }

  const billing = [customer.billingStreet, [customer.billingPostalCode, customer.billingCity].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return (
    <AppShell>
      <Link to="/customers" className={styles.backLink}>
        <FiArrowLeft /> Zákazníci
      </Link>

      <div className={styles.splitHeader}>
        <div>
          <h1 className={styles.pageTitle}>{fullName(customer)}</h1>
          <div className={styles.chipRow} style={{ marginTop: "0.5rem" }}>
            <span className={customer.status === "ACTIVE" ? styles.badgeGreen : styles.badge}>
              {CUSTOMER_STATUS_LABELS[customer.status]}
            </span>
            {customer.companyName && <span className={styles.badge}>{customer.companyName}</span>}
          </div>
        </div>
        <div className={styles.buttonRow}>
          {customer.phone && (
            <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
              <FiPhone /> ZAVOLAŤ
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
              <FiMail /> E-mail
            </a>
          )}
          <Link to={`/customers/${id}/edit`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
            <FiEdit2 /> Upraviť
          </Link>
          {user.role === "OWNER" && (
            <button type="button" className={styles.dangerButton} onClick={handleDelete} title="Odstrániť zákazníka">
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <Section title="Kontakt" icon={FiUser}>
        <div className={styles.infoGrid}>
          <InfoItem label="Telefón">{customer.phone}</InfoItem>
          <InfoItem label="E-mail">{customer.email}</InfoItem>
          <InfoItem label="Preferuje">{CONTACT_LABELS[customer.preferredContact]}</InfoItem>
          <InfoItem label="Odkiaľ prišiel">{SOURCE_LABELS[customer.source]}</InfoItem>
          <InfoItem label="Fakturačná adresa">{billing || "rovnaká ako záhrada"}</InfoItem>
          <InfoItem label="Zákazník od">{formatDate(customer.createdAt)}</InfoItem>
        </div>
        {customer.notes && (
          <div className={styles.calloutBox} style={{ marginTop: "1rem", whiteSpace: "pre-wrap" }}>
            {customer.notes}
          </div>
        )}
      </Section>

      <Section
        title="Záhrady"
        icon={FiHome}
        actions={
          <Link to={`/customers/${id}/gardens/new`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
            <FiPlus /> Pridať záhradu
          </Link>
        }
      >
        {customer.gardens.length === 0 ? (
          <p className={styles.emptyState}>Zákazník zatiaľ nemá žiadnu záhradu.</p>
        ) : (
          <div className={styles.list}>
            {customer.gardens.map((g) => (
              <div key={g.id} className={styles.listCard}>
                <Link to={`/gardens/${g.id}`} className={styles.listCardMain} style={{ color: "inherit", textDecoration: "none" }}>
                  <span className={styles.listCardTitle}>{g.label}</span>
                  <span className={styles.listCardMeta}>{gardenAddress(g)}</span>
                  <span className={styles.chipRow} style={{ marginTop: "0.35rem" }}>
                    <span className={styles.badgeGreen}>{g._count.zones} zón</span>
                    <span className={styles.badge}>{WATER_SOURCE_LABELS[g.waterSource]}</span>
                    {g.installedYear && <span className={styles.badge}>od {g.installedYear}</span>}
                    {g.isSmartController && <span className={styles.badgeBrand}>smart</span>}
                  </span>
                </Link>
                <a href={mapsUrl(g)} target="_blank" rel="noreferrer" className={styles.iconButton} title="Otvoriť v mapách">
                  <FiMapPin />
                </a>
                <Link to={`/gardens/${g.id}`} className={styles.iconButton} title="Technická karta">
                  <FiChevronRight />
                </Link>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Posledné požiadavky"
        icon={FiInbox}
        actions={
          <Link to={`/requests/new?customerId=${id}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
            <FiPlus /> Nová požiadavka
          </Link>
        }
      >
        {customer.serviceRequests.length === 0 ? (
          <p className={styles.emptyState}>Žiadne požiadavky.</p>
        ) : (
          <div className={styles.list}>
            {customer.serviceRequests.map((r) => (
              <RequestCard key={r.id} request={r} showCustomer={false} />
            ))}
          </div>
        )}
      </Section>
    </AppShell>
  );
};
