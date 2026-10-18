import { useEffect, useRef, useState } from "react";
import { FiCamera, FiTrash2, FiX } from "react-icons/fi";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/neumorphic.module.css";

// Fotky sú za prihlásením, preto sa načítajú cez fetch s tokenom, nie priamo cez <img src>.
const usePhotoUrl = (photoId) => {
  const { token } = useAuth();
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    api
      .getPhotoBlob(token, photoId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId, token]);
  return url;
};

const PhotoThumb = ({ photo, onOpen }) => {
  const url = usePhotoUrl(photo.id);
  return (
    <button type="button" className={styles.photoThumb} onClick={() => onOpen(photo, url)}>
      {url && <img src={url} alt={photo.caption || "Fotka záhrady"} />}
      {photo.caption && <span className={styles.photoCaption}>{photo.caption}</span>}
    </button>
  );
};

export const PhotoGallery = ({ gardenId, photos, onChange }) => {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    setIsUploading(true);
    try {
      await api.uploadGardenPhotos(token, gardenId, files, caption);
      setCaption("");
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Naozaj zmazať túto fotku?")) return;
    try {
      await api.deletePhoto(token, open.photo.id);
      setOpen(null);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={`${styles.inputWrapper} ${styles.toolbarSearch}`}>
          <input
            className={styles.input}
            placeholder="Popis fotky (napr. šachta s ventilmi)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        {/* accept="image/*" ponúkne na mobile aj fotoaparát */}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
        <button
          type="button"
          className={styles.primaryButtonInline}
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <FiCamera /> {isUploading ? "NAHRÁVAM…" : "PRIDAŤ FOTKY"}
        </button>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      {photos.length === 0 ? (
        <p className={styles.emptyState}>Zatiaľ žiadne fotky. Odfoť šachtu, riadiacu jednotku a plán zón.</p>
      ) : (
        <div className={styles.photoGrid}>
          {photos.map((photo) => (
            <PhotoThumb key={photo.id} photo={photo} onOpen={(p, url) => setOpen({ photo: p, url })} />
          ))}
        </div>
      )}

      {open && (
        <div className={styles.lightbox} onClick={() => setOpen(null)}>
          {open.url && <img src={open.url} alt={open.photo.caption || "Fotka záhrady"} />}
          {open.photo.caption && <span className={styles.lightboxCaption}>{open.photo.caption}</span>}
          <div className={styles.buttonRow} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.secondaryButton} onClick={() => setOpen(null)}>
              <FiX /> Zavrieť
            </button>
            <button type="button" className={styles.dangerButton} onClick={handleDelete}>
              <FiTrash2 /> Zmazať
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
