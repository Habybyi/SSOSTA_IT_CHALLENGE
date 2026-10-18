import styles from "../styles/neumorphic.module.css";

export const Section = ({ title, icon: Icon, actions, children }) => {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {Icon && <Icon />}
          {title}
        </h2>
        {actions && <div className={styles.buttonRow}>{actions}</div>}
      </div>
      {children}
    </section>
  );
};
