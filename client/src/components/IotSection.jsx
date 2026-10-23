import { useCallback, useEffect, useState } from "react";
import { FiActivity, FiCopy, FiKey, FiPlus, FiTrash2 } from "react-icons/fi";
import { Modal } from "./Modal";
import { PagedList } from "./PagedList";
import { SelectField, TextField } from "./FormFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { DEVICE_TYPE_LABELS, toOptions } from "../utils/labels";
import { formatDateTime } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const EMPTY_DEVICE = { name: "", type: "HUMIDITY_SENSOR", externalId: "" };
const REFRESH_MS = 10000;

const STATUS_BADGE = {
  ok: { className: styles.badgeGreen, label: "OK" },
  warning: { className: styles.badgeHigh, label: "Pozor" },
  alert: { className: styles.badgeEmergency, label: "Poplach" },
  offline: { className: styles.badgeMuted, label: "Offline" },
  waiting: { className: styles.badgeMuted, label: "Čaká na dáta" },
};

// Malý graf za posledných 24 hodín (bez knižnice, stačí čiara).
const Sparkline = ({ readings }) => {
  if (readings.length < 2) return <span className={styles.sparkline} />;
  const width = 140;
  const height = 36;
  const values = readings.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(" ");
  return (
    <svg className={styles.sparkline} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-label="Priebeh za 24 hodín">
      <polyline points={points} fill="none" stroke="var(--neu-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

// Kľúč a návod na pripojenie: zobrazí sa len raz, potom ho už nikto neuvidí.
const TokenModal = ({ result, onClose }) => {
  const url = `${window.location.origin}/api/v1/iot/readings`;
  const snippet = `from realhttp import *
from time import *

URL = "${url}"
TOKEN = "${result.token}"

client = RealHTTPClient()
while True:
    value = analogRead(A0) * 100 / 1023   # napr. vlhkosť v %
    client.post(URL, {"token": TOKEN, "value": value})
    sleep(10)`;
  const curl = `curl -X POST ${url} -H "Content-Type: application/json" -H "X-Device-Token: ${result.token}" -d '{"value": 42}'`;

  return (
    <Modal title={`Pripojenie: ${result.device.name}`} wide onClose={onClose}>
      <div className={styles.calloutBox}>
        Kľúč zariadenia: <code className={styles.codeInline}>{result.token}</code>
      </div>
      <p className={styles.muted}>Kľúč sa zobrazí len teraz. Ak sa stratí, vygeneruj nový (starý tým prestane platiť).</p>
      <h3 className={styles.formPanelTitle}>Packet Tracer (Python na SBC alebo MCU)</h3>
      <pre className={styles.codeBlock}>{snippet}</pre>
      <h3 className={styles.formPanelTitle}>Test z terminálu</h3>
      <pre className={styles.codeBlock}>{curl}</pre>
      <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
        <button type="button" className={styles.secondaryButton} onClick={() => navigator.clipboard?.writeText(result.token)}>
          <FiCopy /> Kopírovať kľúč
        </button>
        <button type="button" className={styles.primaryButtonInline} onClick={onClose}>
          HOTOVO
        </button>
      </div>
    </Modal>
  );
};

// IoT v karte záhrady: posledné hodnoty zo senzorov, stav a graf za 24 hodín.
export const IotSection = ({ gardenId, onChange }) => {
  const { token, user } = useAuth();
  const isOwner = user.role === "OWNER";
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_DEVICE);
  const [fieldErrors, setFieldErrors] = useState({});
  const [tokenResult, setTokenResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listDevices(token, gardenId);
      setDevices(data.devices);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [token, gardenId]);

  // Hodnoty sa obnovujú samé, aby bolo vidno, keď senzor niečo pošle.
  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    try {
      const result = await api.createDevice(token, gardenId, form);
      setIsAdding(false);
      setForm(EMPTY_DEVICE);
      setTokenResult(result);
      load();
      onChange?.();
    } catch (err) {
      setFieldErrors(err.fields || {});
      setError(err.message);
    }
  };

  const handleNewToken = async (device) => {
    if (!window.confirm(`Vygenerovať nový kľúč pre „${device.name}“? Starý prestane platiť.`)) return;
    try {
      setTokenResult(await api.regenerateDeviceToken(token, device.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (device) => {
    if (!window.confirm(`Naozaj odstrániť zariadenie „${device.name}“ aj s jeho históriou?`)) return;
    try {
      await api.deleteDevice(token, device.id);
      load();
      onChange?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const problems = devices.filter((d) => d.status.level === "alert" || d.status.level === "warning");

  const DeviceRow = ({ d }) => {
    const badge = STATUS_BADGE[d.status.level];
    return (
      <div className={`${styles.listCard} ${styles.fixedRow}`} title={d.status.message || undefined}>
        <span className={styles.listCardMain}>
          <span className={styles.listCardTitle}>{d.name}</span>
          <span className={styles.listCardMeta}>
            {DEVICE_TYPE_LABELS[d.type]} · {d.lastSeenAt ? `naposledy ${formatDateTime(d.lastSeenAt)}` : "zatiaľ bez dát"}
          </span>
        </span>
        <Sparkline readings={d.readings} />
        <strong className={styles.iotValue}>{d.display || "–"}</strong>
        <span className={badge.className}>{badge.label}</span>
        {isOwner && (
          <>
            <button type="button" className={styles.iconButton} onClick={() => handleNewToken(d)} title="Nový kľúč zariadenia">
              <FiKey />
            </button>
            <button type="button" className={styles.iconButton} onClick={() => handleDelete(d)} title="Odstrániť zariadenie">
              <FiTrash2 />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <section className={styles.panelFill}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <FiActivity /> Senzory a zariadenia ({devices.length})
        </h2>
        {isOwner && (
          <button type="button" className={styles.secondaryButton} onClick={() => setIsAdding(true)}>
            <FiPlus /> Pridať zariadenie
          </button>
        )}
      </div>

      {problems.map((d) => (
        <div key={d.id} className={d.status.level === "alert" ? styles.calloutAlert : styles.calloutWarning} style={{ marginBottom: "0.6rem", flex: "none" }}>
          <strong>{d.name}:</strong> {d.status.message}
        </div>
      ))}
      {error && <div className={styles.errorMessage} style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <PagedList
        items={devices}
        rowHeight={76}
        empty={
          <p className={styles.emptyState}>
            Záhrada zatiaľ nemá žiadne senzory. {isOwner && "Pridaj zariadenie a dostaneš kľúč na pripojenie (Packet Tracer, ESP32...)."}
          </p>
        }
        renderItem={(d) => <DeviceRow d={d} />}
      />

      {isAdding && (
        <Modal title="Pridať IoT zariadenie" onClose={() => setIsAdding(false)}>
          <form onSubmit={handleCreate} className={styles.form}>
            <TextField name="name" label="Názov" placeholder="napr. Vlhkosť pôdy: predná záhrada" form={form} setForm={setForm} errors={fieldErrors} autoFocus />
            <SelectField name="type" label="Typ" options={toOptions(DEVICE_TYPE_LABELS)} form={form} setForm={setForm} errors={fieldErrors} />
            <TextField name="externalId" label="Označenie v Packet Traceri (nepovinné)" placeholder="napr. SBC-zahrada-1" form={form} setForm={setForm} errors={fieldErrors} />
            <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsAdding(false)}>
                Zrušiť
              </button>
              <button type="submit" className={styles.primaryButtonInline}>
                PRIDAŤ A ZÍSKAŤ KĽÚČ
              </button>
            </div>
          </form>
        </Modal>
      )}

      {tokenResult && <TokenModal result={tokenResult} onClose={() => setTokenResult(null)} />}
    </section>
  );
};
