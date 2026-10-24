import { Field } from "./Field";
import styles from "../styles/neumorphic.module.css";


export const TextField = ({ name, label, form, setForm, errors, type = "text", ...rest }) => (
  <Field label={label} error={errors?.[name]}>
    <input
      type={type}
      className={styles.input}
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      {...rest}
    />
  </Field>
);

export const TextAreaField = ({ name, label, form, setForm, errors, ...rest }) => (
  <Field label={label} error={errors?.[name]}>
    <textarea
      className={styles.textarea}
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
      {...rest}
    />
  </Field>
);

export const SelectField = ({ name, label, options, form, setForm, errors }) => (
  <Field label={label} error={errors?.[name]}>
    <select
      className={styles.select}
      value={form[name]}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </Field>
);

export const CheckboxField = ({ name, label, form, setForm }) => (
  <label className={styles.checkboxLabel}>
    <input
      type="checkbox"
      checked={Boolean(form[name])}
      onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.checked }))}
    />
    {label}
  </label>
);
