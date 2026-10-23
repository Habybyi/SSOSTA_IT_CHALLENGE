import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiEdit2, FiMapPin, FiPhone, FiTrash2, FiDroplet, FiCpu, FiCamera, FiInfo, FiInbox, FiActivity } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { TabBar, useTab } from "../components/Tabs";
import { InfoItem } from "../components/InfoItem";
import { ZonesSection } from "../components/ZonesSection";
import { HistorySection } from "../components/HistorySection";
import { PhotoGallery } from "../components/PhotoGallery";
import { IotSection } from "../components/IotSection";
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
  const tabs = [
    { key: "overview", label: "Prehľad", icon: FiInfo },
    { key: "zones", label: "Zóny", icon: FiDroplet, count: garden?.zones.length },
    { key: "photos", label: "Fotky", icon: FiCamera, count: garden?.photos.length },
    { key: "history", label: "História", icon: FiCpu },
    { key: "iot", label: "IoT", icon: FiActivity, count: garden?.devices.length || undefined },
  ];
  const [tab, setTab] = useTab(tabs);
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
          <div className={styles.chipRow} style={{ marginTop: "0.4rem" }}>
            <span className={styles.muted}>{gardenAddress(garden)}</span>
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
          <Link
            to={`/requests/new?customerId=${garden.customer.id}&gardenId=${id}`}
            className={styles.secondaryButton}
            style={{ textDecoration: "none" }}
          >
            <FiInbox /> Požiadavka
          </Link>
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

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div className={styles.tabPanel}>
        {tab === "overview" && (
          <>
            {age !== null && age >= 4 && (
              <div className={styles.calloutWarning} style={{ marginBottom: "0.85rem", flex: "none" }}>
                Systém je starý {age} rokov{garden.systemVersion ? ` (${garden.systemVersion})` : ""}. Staršie inštalácie môžu mať iné diely,
                skontroluj zóny a fotky pred výjazdom.
              </div>
            )}
            {garden.notes && (
              <div className={styles.calloutBox} style={{ marginBottom: "0.85rem", flex: "none", whiteSpace: "pre-wrap", maxHeight: "5rem", overflow: "hidden" }} title={garden.notes}>
                <FiInfo style={{ verticalAlign: "-2px" }} /> {garden.notes}
              </div>
            )}
            <Section title="Technické údaje" icon={FiCpu}>
              <div className={styles.infoGrid}>
                <InfoItem label="Zdroj vody">{WATER_SOURCE_LABELS[garden.waterSource]}</InfoItem>
                <InfoItem label="Tlak">{garden.waterPressureBar ? `${Number(garden.waterPressureBar)} bar` : ""}</InfoItem>
                <InfoItem label="Prietok">{garden.flowRateLpm ? `${Number(garden.flowRateLpm)} l/min` : ""}</InfoItem>
                <InfoItem label="Hlavný uzáver">{garden.mainValveLocation}</InfoItem>
                <InfoItem label="Riadiaca jednotka">{garden.controllerModel}</InfoItem>
                <InfoItem label="Umiestnenie jednotky">{garden.controllerLocation}</InfoItem>
                <InfoItem label="Ovládanie z mobilu">{yesNo(garden.isSmartController)}</InfoItem>
                <InfoItem label="Dažďový senzor">{yesNo(garden.hasRainSensor)}</InfoItem>
                <InfoItem label="Plocha">{garden.areaM2 ? `${garden.areaM2} m²` : ""}</InfoItem>
                <InfoItem label="Inštalované">{garden.installedYear}</InfoItem>
                <InfoItem label="Verzia systému">{garden.systemVersion}</InfoItem>
                <InfoItem label="GPS">{garden.latitude != null ? `${garden.latitude}, ${garden.longitude}` : ""}</InfoItem>
              </div>
            </Section>
          </>
        )}

        {tab === "zones" && <ZonesSection gardenId={id} zones={garden.zones} onChange={load} />}

        {tab === "photos" && (
          <section className={styles.panelFill}>
            <PhotoGallery gardenId={id} photos={garden.photos} onChange={load} />
          </section>
        )}

        {tab === "history" && <HistorySection gardenId={id} />}

        {tab === "iot" && <IotSection gardenId={id} onChange={load} />}
      </div>
    </AppShell>
  );
};
