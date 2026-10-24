
export const deviceSelect = {
  id: true,
  gardenId: true,
  type: true,
  name: true,
  externalId: true,
  lastValue: true,
  lastSeenAt: true,
  createdAt: true,
};

export const OFFLINE_AFTER_MIN = 30;

const onOff = (on, off) => (value) => (value >= 1 ? on : off);

export const DEVICE_RULES = {
  HUMIDITY_SENSOR: {
    unit: "%",
    check: (v) => (v < 20 ? { level: "warning", message: "Pôda je suchá, skontroluj zavlažovanie." } : null),
  },
  WATER_LEVEL_SENSOR: {
    unit: "%",
    check: (v) => (v < 15 ? { level: "warning", message: "Nízka hladina vody v studni alebo nádrži." } : null),
  },
  TRIP_SENSOR: {
    format: onOff("ÚNIK", "OK"),
    check: (v) => (v >= 1 ? { level: "alert", message: "Senzor hlási únik vody." } : null),
  },
  SPRINKLER: { format: onOff("Zapnutý", "Vypnutý") },
  MOWER: { format: onOff("Kosí", "V stanici") },
  HOME_GATEWAY: { format: () => "Online" },
  OTHER: {},
};

export const formatValue = (type, value) => {
  if (value == null) return "";
  const rule = DEVICE_RULES[type] || {};
  if (rule.format) return rule.format(value);
  const rounded = Math.round(value * 10) / 10;
  return rule.unit ? `${rounded} ${rule.unit}` : String(rounded);
};

export function deviceStatus(device, now = new Date()) {
  const value = device.lastValue?.value;
  if (!device.lastSeenAt || value == null) {
    return { level: "waiting", message: "Zariadenie ešte neposlalo žiadne dáta." };
  }
  const minutes = (now - new Date(device.lastSeenAt)) / 60000;
  if (minutes > OFFLINE_AFTER_MIN) {
    return { level: "offline", message: "Zariadenie sa dlho neozvalo, skontroluj napájanie alebo Wi-Fi." };
  }
  const problem = DEVICE_RULES[device.type]?.check?.(value);
  return problem || { level: "ok", message: "" };
}

export const createsRequest = (type, value) => DEVICE_RULES[type]?.check?.(value)?.level === "alert";

export const presentDevice = (device) => ({
  ...device,
  status: deviceStatus(device),
  display: formatValue(device.type, device.lastValue?.value),
});
