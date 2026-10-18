import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { TextField, TextAreaField, SelectField, CheckboxField } from "../components/FormFields";
import { EMPTY_GARDEN, GARDEN_ADDRESS_FIELDS, GardenAddressFields, GardenTechFields } from "../components/GardenFields";
import { TabBar } from "../components/Tabs";
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
  serviceReminders: true,
};

// Nový zákazník (aj s prvou záhradou) alebo úprava existujúceho.
export const CustomerFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [garden, setGarden] = useState(EMPTY_GARDEN);
  const [step, setStep] = useState("contact");
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
      // Prepni na prvý krok, kde je chyba.
      const fields = Object.keys(err.fields || {});
      const firstBad = steps.find((st) => fields.some((f) => st.fields(f)));
      if (firstBad) setStep(firstBad.key);
    } finally {
      setIsSaving(false);
    }
  };

  const props = { form, setForm, errors };
  const CONTACT = ["firstName", "lastName", "companyName", "phone", "email", "preferredContact"];
  const steps = [
    { key: "contact", label: "1. Kontakt", fields: (f) => CONTACT.includes(f) },
    ...(!isEdit
      ? [
          { key: "address", label: "2. Adresa a prístup", fields: (f) => f.startsWith("garden.") && GARDEN_ADDRESS_FIELDS.includes(f.slice(7)) },
          { key: "tech", label: "3. Technika (nepovinné)", fields: (f) => f.startsWith("garden.") && !GARDEN_ADDRESS_FIELDS.includes(f.slice(7)) },
        ]
      : []),
    { key: "other", label: `${isEdit ? 2 : 4}. Ďalšie údaje`, fields: (f) => !CONTACT.includes(f) && !f.startsWith("garden.") },
  ];
  const tabs = steps.map((st) => ({ ...st, error: Object.keys(errors).some((f) => st.fields(f)) }));
  const index = steps.findIndex((st) => st.key === step);
  const isLast = index === steps.length - 1;

  return (
    <AppShell>
      <Link to={isEdit ? `/customers/${id}` : "/customers"} className={styles.backLink}>
        <FiArrowLeft /> Späť
      </Link>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{isEdit ? "Upraviť zákazníka" : "Nový zákazník"}</h1>
      </div>

      <TabBar tabs={tabs} active={step} onChange={setStep} />

      <form onSubmit={handleSubmit} className={styles.tabPanel}>
        <div className={styles.formPanel} style={{ marginBottom: 0 }}>
          {step === "contact" && (
            <>
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
            </>
          )}
          {step === "address" && <GardenAddressFields form={garden} setForm={setGarden} errors={errors} errorPrefix="garden" />}
          {step === "tech" && <GardenTechFields form={garden} setForm={setGarden} errors={errors} errorPrefix="garden" />}
          {step === "other" && (
            <>
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
                <TextAreaField name="notes" label="Poznámky" rows={2} {...props} />
              </div>
              <CheckboxField name="serviceReminders" label="Posielať servisné pripomienky (zazimovanie, spustenie, termín zajtra)" {...props} />
              <CheckboxField name="marketingConsent" label="Súhlasí so zasielaním noviniek a akcií" {...props} />
            </>
          )}
        </div>

        {error && <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>{error}</div>}

        <div className={styles.actionRow} style={{ flex: "none" }}>
          {index > 0 && (
            <button type="button" className={styles.secondaryButton} onClick={() => setStep(steps[index - 1].key)}>
              Späť
            </button>
          )}
          {!isLast && (
            <button type="button" className={styles.secondaryButton} onClick={() => setStep(steps[index + 1].key)}>
              Ďalej
            </button>
          )}
          <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
            <FiSave /> {isSaving ? "UKLADÁM…" : "ULOŽIŤ"}
          </button>
        </div>
      </form>
    </AppShell>
  );
};
