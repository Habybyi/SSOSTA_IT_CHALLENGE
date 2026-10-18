import { useEffect, useState } from "react";
import { FiSearch, FiUserPlus, FiX } from "react-icons/fi";
import { TextField } from "./FormFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useDebouncedValue } from "../hooks";
import { fullName, initials } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const EMPTY_QUICK = { firstName: "", lastName: "", phone: "", email: "", street: "", city: "" };

// Výber zákazníka pri telefonáte: nájdi podľa mena alebo čísla, prípadne rýchlo založ nového.
export const CustomerPicker = ({ onSelect }) => {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [quick, setQuick] = useState(EMPTY_QUICK);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const debouncedQ = useDebouncedValue(q, 250);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) {
      setResults([]);
      return;
    }
    api
      .listCustomers(token, { q: debouncedQ, pageSize: 6 })
      .then((d) => setResults(d.items))
      .catch(() => setResults([]));
  }, [debouncedQ, token]);

  const startCreate = () => {
    // Čo Milan napísal do hľadania, predvyplníme: číslo do telefónu, inak do mena.
    const looksLikePhone = /^[+\d\s]{5,}$/.test(q.trim());
    const [first = "", ...rest] = looksLikePhone ? [] : q.trim().split(/\s+/);
    setQuick({ ...EMPTY_QUICK, phone: looksLikePhone ? q.trim() : "", firstName: first, lastName: rest.join(" ") });
    setIsCreating(true);
  };

  const handleCreate = async () => {
    setError("");
    setErrors({});
    try {
      const { street, city, ...contact } = quick;
      const data = await api.createCustomer(token, { ...contact, source: "PHONE", garden: { street, city } });
      onSelect(data.customer);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    }
  };

  if (isCreating) {
    const props = { form: quick, setForm: setQuick, errors };
    const gardenErrors = { street: errors["garden.street"], city: errors["garden.city"] };
    return (
      <div>
        <div className={styles.formRow}>
          <TextField name="firstName" label="Meno *" {...props} />
          <TextField name="lastName" label="Priezvisko *" {...props} />
          <TextField name="phone" label="Telefón" type="tel" {...props} />
          <TextField name="email" label="E-mail" type="email" {...props} />
        </div>
        <div className={styles.formRow} style={{ marginTop: "1rem" }}>
          <TextField name="street" label="Ulica záhrady *" form={quick} setForm={setQuick} errors={gardenErrors} />
          <TextField name="city" label="Obec *" form={quick} setForm={setQuick} errors={gardenErrors} />
        </div>
        {error && <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>{error}</div>}
        <div className={styles.actionRow}>
          <button type="button" className={styles.secondaryButton} onClick={() => setIsCreating(false)}>
            <FiX /> Späť na hľadanie
          </button>
          <button type="button" className={styles.primaryButtonInline} onClick={handleCreate}>
            <FiUserPlus /> ZALOŽIŤ A POKRAČOVAŤ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.inputWrapper}>
        <FiSearch />
        <input
          className={styles.input}
          placeholder="Meno alebo telefón zákazníka"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      {results.length > 0 && (
        <div className={styles.list} style={{ marginTop: "0.85rem" }}>
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.listCard}
              style={{ border: "none", textAlign: "left", cursor: "pointer", font: "inherit" }}
              onClick={() => onSelect(c)}
            >
              <span className={styles.avatar}>{initials(c)}</span>
              <span className={styles.listCardMain}>
                <span className={styles.listCardTitle}>{fullName(c)}</span>
                <span className={styles.listCardMeta}>
                  {[c.phone, c.gardens.map((g) => `${g.street}, ${g.city}`).join(" · ")].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {debouncedQ.length >= 2 && results.length === 0 && (
        <p className={styles.muted} style={{ margin: "0.85rem 0 0" }}>Nikoho sme nenašli.</p>
      )}
      <button type="button" className={styles.linkButton} style={{ marginTop: "1rem" }} onClick={startCreate}>
        <FiUserPlus /> Nový zákazník
      </button>
    </div>
  );
};
