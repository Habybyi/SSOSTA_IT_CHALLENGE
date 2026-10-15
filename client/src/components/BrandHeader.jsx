import styles from "../styles/neumorphic.module.css";

export const SLOGAN = "Kráľovský trávnik bez starostí";

export const BrandHeader = () => {
  return (
    <div className={styles.brand}>
      <img src="/logo.png" alt="Custodia" className={styles.brandLogo} />
      <span className={styles.brandSlogan}>{SLOGAN}</span>
    </div>
  );
};
