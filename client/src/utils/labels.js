// Ľudské názvy pre hodnoty z API (enumy v databáze sú po anglicky).
export const ROLE_LABELS = {
  OWNER: "Majiteľ",
  TECHNICIAN: "Technik",
  CUSTOMER: "Zákazník",
};

export const CUSTOMER_STATUS_LABELS = {
  LEAD: "Dopyt",
  ACTIVE: "Aktívny",
  INACTIVE: "Neaktívny",
};

export const SOURCE_LABELS = {
  MANUAL: "Zadané ručne",
  PHONE: "Telefonát",
  REFERRAL: "Odporúčanie",
  EMAIL: "E-mail",
  WEB_FORM: "Formulár na webe",
  CALCULATOR: "Kalkulačka na webe",
  CUSTOMER_PORTAL: "Zákaznícky portál",
};

export const CONTACT_LABELS = {
  PHONE: "Telefonát",
  SMS: "SMS",
  EMAIL: "E-mail",
};

export const WATER_SOURCE_LABELS = {
  MAINS: "Vodovod",
  WELL: "Studňa",
  RAINWATER: "Dažďová voda",
  OTHER: "Iné",
};

export const ZONE_AREA_LABELS = {
  LAWN: "Trávnik",
  BED: "Záhon",
  HEDGE: "Živý plot",
  OTHER: "Iné",
};

export const IRRIGATION_LABELS = {
  SPRINKLER: "Postrekovače",
  DRIP: "Kvapková závlaha",
};

export const REQUEST_TYPE_LABELS = {
  FAULT: "Porucha",
  SPRING_START: "Jarné spustenie",
  WINTERIZATION: "Zazimovanie",
  LAWN_CARE: "Starostlivosť o trávnik",
  INSTALLATION: "Inštalácia",
  INSPECTION: "Obhliadka",
  OTHER: "Iné",
};

export const REQUEST_STATUS_LABELS = {
  NEW: "Nová",
  SCHEDULED: "Naplánovaná",
  IN_PROGRESS: "V riešení",
  DONE: "Hotová",
  CLOSED: "Uzavretá",
  CANCELLED: "Zrušená",
};

export const PRIORITY_LABELS = {
  LOW: "Nízka",
  NORMAL: "Normálna",
  HIGH: "Vysoká",
  EMERGENCY: "Havária",
};

export const NOTIFICATION_LABELS = {
  REQUEST_RECEIVED: "Potvrdenie prijatia",
  REQUEST_DONE: "Oznámenie o vybavení",
  STAFF_NEW_REQUEST: "Upozornenie pre majiteľa",
};

export const NOTIFICATION_STATUS_LABELS = {
  PENDING: "čaká na odoslanie",
  SENT: "odoslané",
  FAILED: "zlyhalo",
  CANCELLED: "zrušené",
};

// Hodnoty z kalkulačky na webe (payload požiadavky).
export const PAYLOAD_LABELS = {
  areaM2: "Plocha (m²)",
  lawnM2: "Trávnik (m²)",
  bedsM2: "Záhony (m²)",
  hedgeM: "Živý plot (m)",
  zones: "Odhad zón",
  priceFrom: "Cena od (€)",
  priceTo: "Cena do (€)",
  waterSource: "Zdroj vody",
  rainSensor: "Dažďový senzor",
  mobileControl: "Ovládanie z mobilu",
};

export const APPOINTMENT_STATUS_LABELS = {
  RESERVED: "Rezervácia (čas treba potvrdiť)",
  CONFIRMED: "Potvrdený",
  DONE: "Hotový",
  CANCELLED: "Zrušený",
};

export const WEEKDAY_LABELS = { 1: "Po", 2: "Ut", 3: "St", 4: "Št", 5: "Pi", 6: "So", 7: "Ne" };

export const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));
