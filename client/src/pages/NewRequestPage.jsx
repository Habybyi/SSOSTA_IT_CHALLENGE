import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiAlertTriangle,
  FiPlay,
  FiCloudSnow,
  FiScissors,
  FiTool,
  FiEye,
  FiMoreHorizontal,
  FiSave,
  FiX,
} from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { CustomerPicker } from "../components/CustomerPicker";
import { TextField, TextAreaField, SelectField, CheckboxField } from "../components/FormFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { PRIORITY_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import { fullName } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const TYPE_ICONS = {
  FAULT: FiAlertTriangle,
  SPRING_START: FiPlay,
  WINTERIZATION: FiCloudSnow,
  LAWN_CARE: FiScissors,
  INSTALLATION: FiTool,
  INSPECTION: FiEye,
  OTHER: FiMoreHorizontal,
};

export const NewRequestPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [gardens, setGardens] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [form, setForm] = useState({
    gardenId: "",
    type: "",
    priority: "NORMAL",
    title: "",
    description: "",
    assignedToId: "",
    notifyCustomer: true,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [token]);

  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (customerId) api.getCustomer(token, customerId).then((d) => setCustomer(d.customer)).catch(() => {});
  }, [searchParams, token]);

  useEffect(() => {
    if (!customer) return;
    api.getCustomer(token, customer.id).then((d) => {
      setGardens(d.customer.gardens);
      const gardenFromUrl = searchParams.get("gardenId");
      setForm((f) => ({ ...f, gardenId: gardenFromUrl || d.customer.gardens[0]?.id || "" }));
      setCustomer(d.customer);
    });
  }, [customer?.id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    if (!form.type) {
      setErrors({ type: "Vyber, čo zákazník potrebuje." });
      return;
    }
    setIsSaving(true);
    try {
      const data = await api.createRequest(token, { ...form, customerId: customer.id, source: "PHONE" });
      navigate(`/requests/${data.request.id}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      setIsSaving(false);
    }
  };

  const props = { form, setForm, errors };

  return (
    <AppShell>
      <Link to="/requests" className={styles.backLink}>
        <FiArrowLeft /> Požiadavky
      </Link>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Nová požiadavka</h1>
      </div>

      <div className={styles.formPanel} style={{ marginBottom: "0.85rem", flex: "none", padding: customer ? "0.75rem" : undefined }}>
        {!customer && <h2 className={styles.formPanelTitle}>1. Zákazník</h2>}
        {customer ? (
          <div className={styles.listCard}>
            <span className={styles.listCardMain}>
              <span className={styles.listCardTitle}>{fullName(customer)}</span>
              <span className={styles.listCardMeta}>{[customer.phone, customer.email].filter(Boolean).join(" · ")}</span>
            </span>
            <button type="button" className={styles.secondaryButton} onClick={() => setCustomer(null)}>
              <FiX /> Zmeniť
            </button>
          </div>
        ) : (
          <CustomerPicker onSelect={setCustomer} />
        )}
      </div>

      {customer && (
        <form onSubmit={handleSubmit}>
          <div className={styles.formPanel} style={{ marginBottom: 0 }}>
            <h2 className={styles.formPanelTitle}>2. Čo potrebuje</h2>
            <div className={styles.choiceGrid}>
              {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => {
                const Icon = TYPE_ICONS[value];
                return (
                  <button
                    key={value}
                    type="button"
                    className={form.type === value ? styles.choiceActive : styles.choice}
                    onClick={() => setForm((f) => ({ ...f, type: value, priority: value === "FAULT" ? "HIGH" : f.priority }))}
                  >
                    <Icon />
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.type && <p className={styles.fieldError}>{errors.type}</p>}

            <h3 className={styles.formPanelTitle} style={{ marginTop: "1rem" }}>Priorita</h3>
            <div className={styles.tabs}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={form.priority === value ? styles.tabActive : styles.tab}
                  onClick={() => setForm((f) => ({ ...f, priority: value }))}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={styles.formRow} style={{ marginTop: "0.5rem" }}>
              {gardens.length > 1 && (
                <SelectField
                  name="gardenId"
                  label="Záhrada"
                  options={gardens.map((g) => ({ value: g.id, label: `${g.label}: ${g.street}, ${g.city}` }))}
                  {...props}
                />
              )}
              <TextField name="title" label="Krátky názov (nepovinné)" placeholder="doplní sa podľa typu" {...props} />
              <SelectField
                name="assignedToId"
                label="Kto to vybaví"
                options={[{ value: "", label: "Zatiaľ nikto" }, ...assignees.map((u) => ({ value: u.id, label: u.name }))]}
                {...props}
              />
            </div>
            <div style={{ marginTop: "1rem" }}>
              <TextAreaField name="description" label="Popis" rows={2} placeholder="Čo presne hovoril zákazník" {...props} />
            </div>
            {customer.email ? (
              <CheckboxField name="notifyCustomer" label={`Poslať potvrdenie na ${customer.email}`} {...props} />
            ) : (
              <p className={styles.muted} style={{ margin: "0.75rem 0 0" }}>
                Zákazník nemá e-mail, potvrdenie sa nepošle.
              </p>
            )}
          </div>

          {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

          <div className={styles.actionRow}>
            <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
              <FiSave /> {isSaving ? "UKLADÁM…" : "ULOŽIŤ POŽIADAVKU"}
            </button>
          </div>
        </form>
      )}
    </AppShell>
  );
};
