// Slovenské názvy pre texty e-mailov (frontend má vlastné v utils/labels.js).
export const REQUEST_TYPE_LABELS = {
  FAULT: "porucha",
  SPRING_START: "jarné spustenie",
  WINTERIZATION: "zazimovanie",
  LAWN_CARE: "starostlivosť o trávnik",
  INSTALLATION: "inštalácia",
  INSPECTION: "obhliadka",
  OTHER: "iné",
};

export const PRIORITY_LABELS = { LOW: "nízka", NORMAL: "normálna", HIGH: "vysoká", EMERGENCY: "HAVÁRIA" };

export const SOURCE_LABELS = {
  MANUAL: "zadané ručne",
  PHONE: "telefonát",
  REFERRAL: "odporúčanie",
  EMAIL: "e-mail",
  WEB_FORM: "formulár na webe",
  CALCULATOR: "kalkulačka na webe",
  CUSTOMER_PORTAL: "zákaznícky portál",
};
