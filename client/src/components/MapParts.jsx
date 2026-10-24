import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "../styles/neumorphic.module.css";

export const DEFAULT_CENTER = [49.059, 20.2979];

export const hasGps = (garden) => garden?.latitude != null && garden?.longitude != null;

export const navigationUrl = (garden) => {
  const destination = hasGps(garden) ? `${garden.latitude},${garden.longitude}` : `${garden.street}, ${garden.city}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
};

export const numberIcon = (label, variant = "default") =>
  L.divIcon({
    className: "",
    html: `<span class="${variant === "done" ? styles.mapPinDone : styles.mapPin}">${label}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

export const FitBounds = ({ points }) => {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, key]);
  return null;
};

const AutoResize = () => {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
};

export const ClickHandler = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) });
  return null;
};

export const BaseMap = ({ center = DEFAULT_CENTER, zoom = 12, children, style }) => (
  <MapContainer center={center} zoom={zoom} className={styles.map} style={style} scrollWheelZoom>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    <AutoResize />
    {children}
  </MapContainer>
);
