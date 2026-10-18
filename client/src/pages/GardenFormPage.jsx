import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { EMPTY_GARDEN, GardenAddressFields, GardenTechFields } from "../components/GardenFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { toFormValues } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

// /customers/:customerId/gardens/new = nová záhrada, /gardens/:id/edit = úprava karty.
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppShell>
      <Link to={backTo} className={styles.backLink}>
        <FiArrowLeft /> Späť
      </Link>
      <h1 className={styles.pageTitle} style={{ marginBottom: "1.25rem" }}>
        {isEdit ? "Upraviť technickú kartu" : "Nová záhrada"}
      </h1>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.formPanel}>
          <h2 className={styles.formPanelTitle}>Adresa</h2>
          <GardenAddressFields form={form} setForm={setForm} errors={errors} />
          <GardenTechFields form={form} setForm={setForm} errors={errors} />
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
