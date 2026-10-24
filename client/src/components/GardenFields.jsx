import { TextField, TextAreaField, SelectField, CheckboxField } from "./FormFields";
import { WATER_SOURCE_LABELS, toOptions } from "../utils/labels";
import { LocationPicker } from "./LocationPicker";
import styles from "../styles/neumorphic.module.css";

export const EMPTY_GARDEN = {
  label: "",
  street: "",
  city: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  areaM2: "",
  waterSource: "MAINS",
  waterPressureBar: "",
  flowRateLpm: "",
  mainValveLocation: "",
  controllerModel: "",
  controllerLocation: "",
  isSmartController: false,
  hasRainSensor: false,
  installedYear: "",
  systemVersion: "",
  notes: "",
};

const scoped = (errors, prefix) =>
  prefix
    ? Object.fromEntries(
        Object.entries(errors || {})
          .filter(([k]) => k.startsWith(`${prefix}.`))
          .map(([k, v]) => [k.slice(prefix.length + 1), v])
      )
    : errors;

export const GardenAddressFields = ({ form, setForm, errors, errorPrefix }) => {
  const e = scoped(errors, errorPrefix);
  const props = { form, setForm, errors: e };
  return (
    <>
      <div className={styles.formRow}>
        <TextField name="street" label="Ulica a číslo *" {...props} />
        <TextField name="city" label="Obec *" {...props} />
        <TextField name="postalCode" label="PSČ" {...props} />
      </div>
      <div className={styles.formRow} style={{ marginTop: "1rem" }}>
        <TextField name="label" label="Názov (ak má viac záhrad)" placeholder="Hlavná záhrada" {...props} />
        <TextField name="areaM2" label="Plocha záhrady (m²)" inputMode="numeric" {...props} />
        <TextField name="latitude" label="GPS šírka" inputMode="decimal" placeholder="49.0556" {...props} />
        <TextField name="longitude" label="GPS dĺžka" inputMode="decimal" placeholder="20.2979" {...props} />
        <LocationPicker form={form} setForm={setForm} />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <TextAreaField name="notes" label="Poznámky a prístup" rows={2} placeholder="Pes na dvore, kľúč od šachty u suseda…" {...props} />
      </div>
    </>
  );
};

export const GardenTechFields = ({ form, setForm, errors, errorPrefix }) => {
  const e = scoped(errors, errorPrefix);
  const props = { form, setForm, errors: e };
  return (
    <>
      <h3 className={styles.formPanelTitle}>Zdroj vody</h3>
      <div className={styles.formRow}>
        <SelectField name="waterSource" label="Zdroj" options={toOptions(WATER_SOURCE_LABELS)} {...props} />
        <TextField name="waterPressureBar" label="Tlak (bar)" inputMode="decimal" {...props} />
        <TextField name="flowRateLpm" label="Prietok (l/min)" inputMode="decimal" {...props} />
        <TextField name="mainValveLocation" label="Hlavný uzáver (kde je)" {...props} />
      </div>

      <h3 className={styles.formPanelTitle} style={{ marginTop: "1rem" }}>Riadiaca jednotka a systém</h3>
      <div className={styles.formRow}>
        <TextField name="controllerModel" label="Model jednotky" placeholder="napr. Hunter Pro-HC" {...props} />
        <TextField name="controllerLocation" label="Umiestnenie jednotky" {...props} />
        <TextField name="installedYear" label="Rok inštalácie" inputMode="numeric" {...props} />
        <TextField name="systemVersion" label="Verzia systému" placeholder="napr. v1 (staré prevedenie)" {...props} />
      </div>
      <div className={styles.chipRow} style={{ marginTop: "0.5rem" }}>
        <CheckboxField name="isSmartController" label="Ovládanie z mobilu (smart)" {...props} />
        <CheckboxField name="hasRainSensor" label="Dažďový senzor" {...props} />
      </div>

    </>
  );
};

export const GARDEN_ADDRESS_FIELDS = ["street", "city", "postalCode", "label", "areaM2", "latitude", "longitude", "notes"];
