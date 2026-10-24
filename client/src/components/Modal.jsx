import { FiX } from "react-icons/fi";
import { Portal } from "./Portal";
import styles from "../styles/neumorphic.module.css";

export const Modal = ({ title, onClose, wide = false, children }) => (
  <Portal>
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={wide ? styles.modalWide : styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sectionHeader} style={{ flexWrap: "nowrap", alignItems: "flex-start" }}>
          <h2 className={styles.sectionTitle} style={{ flex: 1 }}>
            {title}
          </h2>
          <button type="button" className={styles.iconButton} onClick={onClose} title="Zavrieť">
            <FiX />
          </button>
        </div>
        {children}
      </div>
    </div>
  </Portal>
);
