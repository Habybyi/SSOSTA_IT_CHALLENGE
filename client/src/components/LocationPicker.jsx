import { useState } from "react";
import { FiMapPin } from "react-icons/fi";
import { Marker } from "react-leaflet";
import { Modal } from "./Modal";
import { BaseMap, ClickHandler, DEFAULT_CENTER, numberIcon } from "./MapParts";
import styles from "../styles/neumorphic.module.css";

const toNumber = (value) => (value === "" || value == null ? null : Number(value));

export const LocationPicker = ({ form, setForm }) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = toNumber(form.latitude) != null && toNumber(form.longitude) != null ? [toNumber(form.latitude), toNumber(form.longitude)] : null;
  const [picked, setPicked] = useState(current);

  const open = () => {
    setPicked(current);
    setIsOpen(true);
  };

  const apply = () => {
    if (picked) setForm((f) => ({ ...f, latitude: picked[0].toFixed(6), longitude: picked[1].toFixed(6) }));
    setIsOpen(false);
  };

  return (
    <>
      <button type="button" className={styles.secondaryButton} onClick={open} style={{ alignSelf: "flex-end" }}>
        <FiMapPin /> {current ? "ZMENIŤ NA MAPE" : "VYBRAŤ NA MAPE"}
      </button>

      {isOpen && (
        <Modal title="Poloha záhrady" wide onClose={() => setIsOpen(false)}>
          <p className={styles.muted} style={{ marginTop: 0 }}>
            Klikni na miesto záhrady. {form.street && `Adresa: ${form.street}, ${form.city}`}
          </p>
          <div className={styles.mapPanel} style={{ height: 420 }}>
            <BaseMap center={current || DEFAULT_CENTER} zoom={current ? 16 : 12}>
              <ClickHandler onClick={setPicked} />
              {picked && <Marker position={picked} icon={numberIcon("✓")} />}
            </BaseMap>
          </div>
          <div className={styles.actionRow}>
            <span className={styles.muted}>{picked ? `${picked[0].toFixed(5)}, ${picked[1].toFixed(5)}` : "Poloha zatiaľ nie je vybraná."}</span>
            <button type="button" className={styles.primaryButtonInline} onClick={apply} disabled={!picked}>
              POUŽIŤ
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};
