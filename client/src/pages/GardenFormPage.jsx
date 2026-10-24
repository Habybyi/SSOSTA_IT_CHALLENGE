import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { EMPTY_GARDEN, GARDEN_ADDRESS_FIELDS, GardenAddressFields, GardenTechFields } from "../components/GardenFields";
import { TabBar } from "../components/Tabs";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { toFormValues } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

export const GardenFormPage = () => {
  const { id, customerId } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState(EMPTY_GARDEN);
  const [backTo, setBackTo] = useState(isEdit ? `/gardens/${id}` : `/customers/${customerId}`);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState("address");

  useEffect(() => {
    if (!isEdit) return;
    api
      .getGarden(token, id)
      .then((d) => {
        setForm(toFormValues(d.garden, EMPTY_GARDEN));
        setBackTo(`/gardens/${id}`);
      })
      .catch((err) => setError(err.message));
  }, [isEdit, id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setIsSaving(true);
    try {
      const result = isEdit ? await api.updateGarden(token, id, form) : await api.createGarden(token, customerId, form);
      navigate(`/gardens/${result.garden.id}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      const fields = Object.keys(err.fields || {});
      if (fields.some((f) => GARDEN_ADDRESS_FIELDS.includes(f))) setStep("address");
      else if (fields.length) setStep("tech");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { key: "address", label: "Adresa a prístup", error: Object.keys(errors).some((f) => GARDEN_ADDRESS_FIELDS.includes(f)) },
    { key: "tech", label: "Voda a jednotka", error: Object.keys(errors).some((f) => !GARDEN_ADDRESS_FIELDS.includes(f)) },
  ];

  return (
    <AppShell>
      <Link to={backTo} className={styles.backLink}>
        <FiArrowLeft /> Späť
      </Link>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{isEdit ? "Upraviť technickú kartu" : "Nová záhrada"}</h1>
      </div>

      <TabBar tabs={tabs} active={step} onChange={setStep} />

      <form onSubmit={handleSubmit} className={styles.tabPanel}>
        <div className={styles.formPanel} style={{ marginBottom: 0 }}>
          {step === "address" ? (
            <GardenAddressFields form={form} setForm={setForm} errors={errors} />
          ) : (
            <GardenTechFields form={form} setForm={setForm} errors={errors} />
          )}
        </div>
        {error && <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>{error}</div>}
        <div className={styles.actionRow} style={{ flex: "none" }}>
          {step === "address" && (
            <button type="button" className={styles.secondaryButton} onClick={() => setStep("tech")}>
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
