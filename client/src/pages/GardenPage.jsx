import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiMapPin, FiPhone, FiTrash2, FiDroplet, FiCpu, FiCamera, FiInfo } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { InfoItem } from "../components/InfoItem";
import { ZonesSection } from "../components/ZonesSection";
import { HistorySection } from "../components/HistorySection";
import { PhotoGallery } from "../components/PhotoGallery";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { WATER_SOURCE_LABELS } from "../utils/labels";
import { fullName, gardenAddress, mapsUrl } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const yesNo = (v) => (v ? "Áno" : "Nie");

// Technická karta záhrady: všetko, čo treba vedieť pred výjazdom.
export const GardenPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [garden, setGarden] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .getGarden(token, id)
      .then((d) => setGarden(d.garden))
      .catch((err) => setError(err.message));
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!window.confirm("Naozaj odstrániť túto záhradu?")) return;
    try {
      await api.deleteGarden(token, id);
      navigate(`/customers/${garden.customer.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!garden) {
    return (
      <AppShell>
        {error ? <div className={styles.errorMessage}>{error}</div> : <p className={styles.muted}>Načítavam…</p>}
      </AppShell>
    );
  }

  const age = garden.installedYear ? new Date().getFullYear() - garden.installedYear : null;

  return (
    <AppShell>
      <Link to={`/customers/${garden.customer.id}`} className={styles.backLink}>
        <FiArrowLeft /> {fullName(garden.customer)}
      </Link>

      <div className={styles.splitHeader}>
        <div>
          <h1 className={styles.pageTitle}>{garden.label}</h1>
          <p className={styles.muted} style={{ margin: "0.3rem 0 0" }}>{gardenAddress(garden)}</p>
          <div className={styles.chipRow} style={{ marginTop: "0.6rem" }}>
            <span className={styles.badgeGreen}>{garden.zones.length} zón</span>
            <span className={styles.badge}>{WATER_SOURCE_LABELS[garden.waterSource]}</span>
            {garden.installedYear && <span className={styles.badge}>inštalované {garden.installedYear}</span>}
            {garden.systemVersion && <span className={styles.badge}>{garden.systemVersion}</span>}
            {garden.isSmartController && <span className={styles.badgeBrand}>smart</span>}
          </div>
        </div>
        <div className={styles.buttonRow}>
          <a href={mapsUrl(garden)} target="_blank" rel="noreferrer" className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
            <FiMapPin /> NAVIGOVAŤ
          </a>
          {garden.customer.phone && (
            <a href={`tel:${garden.customer.phone.replace(/\s/g, "")}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
              <FiPhone /> Zavolať
            </a>
          )}
          <Link to={`/gardens/${id}/edit`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
            <FiEdit2 /> Upraviť
          </Link>
          {user.role === "OWNER" && (
            <button type="button" className={styles.dangerButton} onClick={handleDelete} title="Odstrániť záhradu">
              <FiTrash2 />
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      {age !== null && age >= 4 && (
        <div className={styles.calloutWarning} style={{ marginBottom: "1.5rem" }}>
          Systém je starý {age} rokov{garden.systemVersion ? ` (${garden.systemVersion})` : ""}. Staršie inštalácie môžu mať
          iné diely, skontroluj zóny a fotky pred výjazdom.
        </div>
      )}

      {garden.notes && (
        <Section title="Dôležité poznámky" icon={FiInfo}>
          <p className={styles.infoValue} style={{ whiteSpace: "pre-wrap" }}>{garden.notes}</p>
        </Section>
      )}

      <Section title="Zdroj vody" icon={FiDroplet}>
        <div className={styles.infoGrid}>
          <InfoItem label="Zdroj">{WATER_SOURCE_LABELS[garden.waterSource]}</InfoItem>
          <InfoItem label="Tlak">{garden.waterPressureBar ? `${Number(garden.waterPressureBar)} bar` : ""}</InfoItem>
          <InfoItem label="Prietok">{garden.flowRateLpm ? `${Number(garden.flowRateLpm)} l/min` : ""}</InfoItem>
          <InfoItem label="Hlavný uzáver">{garden.mainValveLocation}</InfoItem>
        </div>
      </Section>

      <Section title="Riadiaca jednotka" icon={FiCpu}>
        <div className={styles.infoGrid}>
          <InfoItem label="Model">{garden.controllerModel}</InfoItem>
          <InfoItem label="Umiestnenie">{garden.controllerLocation}</InfoItem>
          <InfoItem label="Ovládanie z mobilu">{yesNo(garden.isSmartController)}</InfoItem>
          <InfoItem label="Dažďový senzor">{yesNo(garden.hasRainSensor)}</InfoItem>
          <InfoItem label="Plocha záhrady">{garden.areaM2 ? `${garden.areaM2} m²` : ""}</InfoItem>
        </div>
      </Section>

      <ZonesSection gardenId={id} zones={garden.zones} onChange={load} />

      <Section title={`Fotky (${garden.photos.length})`} icon={FiCamera}>
        <PhotoGallery gardenId={id} photos={garden.photos} onChange={load} />
      </Section>

      <HistorySection gardenId={id} />
    </AppShell>
  );
};
