import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { TextField, TextAreaField, SelectField, CheckboxField } from "../components/FormFields";
import { EMPTY_GARDEN, GardenAddressFields, GardenTechFields } from "../components/GardenFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { CONTACT_LABELS, CUSTOMER_STATUS_LABELS, SOURCE_LABELS, toOptions } from "../utils/labels";
import { toFormValues } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const EMPTY_CUSTOMER = {
  firstName: "",
  lastName: "",
  companyName: "",
  phone: "",
  email: "",
  preferredContact: "PHONE",
  status: "ACTIVE",
  source: "MANUAL",
  billingStreet: "",
  billingCity: "",
  billingPostalCode: "",
  notes: "",
  marketingConsent: false,
};

// Nový zákazník (aj s prvou záhradou) alebo úprava existujúceho.
export const CustomerFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [garden, setGarden] = useState(EMPTY_GARDEN);
  const [showTech, setShowTech] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getCustomer(token, id)
      .then((d) => setForm(toFormValues(d.customer, EMPTY_CUSTOMER)))
      .catch((err) => setError(err.message));
  }, [isEdit, id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setIsSaving(true);
    try {
      const result = isEdit
        ? await api.updateCustomer(token, id, form)
        : await api.createCustomer(token, { ...form, garden });
      navigate(`/customers/${result.customer.id}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  const props = { form, setForm, errors };

  return (
    <AppShell>
      <Link to={isEdit ? `/customers/${id}` : "/customers"} className={styles.backLink}>
        <FiArrowLeft /> Späť
      </Link>
      <h1 className={styles.pageTitle} style={{ marginBottom: "1.25rem" }}>
        {isEdit ? "Upraviť zákazníka" : "Nový zákazník"}
      </h1>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formPanel}>
          <h2 className={styles.formPanelTitle}>Kontakt</h2>
          <div className={styles.formRow}>
            <TextField name="firstName" label="Meno *" autoComplete="off" {...props} />
            <TextField name="lastName" label="Priezvisko *" autoComplete="off" {...props} />
            <TextField name="companyName" label="Firma (nepovinné)" {...props} />
          </div>
          <div className={styles.formRow} style={{ marginTop: "1rem" }}>
            <TextField name="phone" label="Telefón" type="tel" placeholder="+421 9xx xxx xxx" {...props} />
            <TextField name="email" label="E-mail" type="email" {...props} />
            <SelectField name="preferredContact" label="Ako ho kontaktovať" options={toOptions(CONTACT_LABELS)} {...props} />
          </div>
          <p className={styles.muted} style={{ margin: "0.75rem 0 0" }}>Stačí telefón alebo e-mail, ideálne oboje.</p>
        </div>

        {!isEdit && (
          <div className={styles.formPanel}>
            <h2 className={styles.formPanelTitle}>Adresa záhrady</h2>
            <GardenAddressFields form={garden} setForm={setGarden} errors={errors} errorPrefix="garden" />
            {showTech ? (
              <GardenTechFields form={garden} setForm={setGarden} errors={errors} errorPrefix="garden" />
            ) : (
              <button type="button" className={styles.linkButton} style={{ marginTop: "1rem" }} onClick={() => setShowTech(true)}>
                + Vyplniť aj technické údaje (dá sa aj neskôr)
              </button>
            )}
          </div>
        )}

        <div className={styles.formPanel}>
          <h2 className={styles.formPanelTitle}>Ďalšie údaje</h2>
          <div className={styles.formRow}>
            <SelectField name="status" label="Stav" options={toOptions(CUSTOMER_STATUS_LABELS)} {...props} />
            <SelectField name="source" label="Odkiaľ prišiel" options={toOptions(SOURCE_LABELS)} {...props} />
          </div>
          <div className={styles.formRow} style={{ marginTop: "1rem" }}>
            <TextField name="billingStreet" label="Fakturačná ulica (ak iná)" {...props} />
            <TextField name="billingCity" label="Fakturačná obec" {...props} />
            <TextField name="billingPostalCode" label="PSČ" {...props} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <TextAreaField name="notes" label="Poznámky" {...props} />
          </div>
          <CheckboxField name="marketingConsent" label="Súhlasí so zasielaním noviniek a pripomienok" {...props} />
        </div>

        <div className={styles.actionRow}>
          <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
            <FiSave /> {isSaving ? "UKLADÁM…" : "ULOŽIŤ"}
          </button>
        </div>
      </form>
    </AppShell>
  );
};
