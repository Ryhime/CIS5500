import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

function usePrefersDark() {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return dark;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const b = L.latLngBounds(points);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 15 });
  }, [map, points]);
  return null;
}

/**
 * @param {number} lat - city center latitude
 * @param {number} lng - city center longitude
 * @param {string} label - city name (center marker)
 * @param {Array<{ map_latitude: number, map_longitude: number, name: string, street_address?: string, map_location_approximate?: boolean }>} hotelMarkers
 */
export default function CityLeafletMap({ lat, lng, label, hotelMarkers = [] }) {
  const dark = usePrefersDark();
  const center = useMemo(() => [Number(lat), Number(lng)], [lat, lng]);

  const boundsPoints = useMemo(() => {
    const pts = [center];
    for (const h of hotelMarkers) {
      const la = Number(h.map_latitude);
      const lo = Number(h.map_longitude);
      if (Number.isFinite(la) && Number.isFinite(lo)) pts.push([la, lo]);
    }
    return pts;
  }, [center, hotelMarkers]);

  return (
    <div className="leaflet-wrap">
      <MapContainer
        center={center}
        zoom={12}
        className="leaflet-map-canvas"
        scrollWheelZoom
        aria-label={`Map of ${label} and hotels`}
      >
        <TileLayer
          attribution={
            dark
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
          url={dark ? DARK_TILES : OSM_TILES}
        />
        <FitBounds points={boundsPoints} />
        <CircleMarker
          center={center}
          radius={11}
          pathOptions={{
            color: "#c45c26",
            fillColor: "#f4a261",
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{label}</strong>
            <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>City center</div>
          </Popup>
        </CircleMarker>
        {hotelMarkers.map((h) => {
          const la = Number(h.map_latitude);
          const lo = Number(h.map_longitude);
          if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
          return (
            <Marker key={h.id ?? `${h.name}-${la}-${lo}`} position={[la, lo]}>
              <Popup>
                <strong>{h.name}</strong>
                {h.street_address ? (
                  <div style={{ fontSize: "0.85rem", marginTop: "0.35rem" }}>{h.street_address}</div>
                ) : null}
                {h.map_location_approximate === true ? (
                  <div style={{ fontSize: "0.78rem", marginTop: "0.35rem", opacity: 0.85 }}>
                    Approximate pin near city center (address could not be geocoded).
                  </div>
                ) : h.map_location_approximate === false ? (
                  <div style={{ fontSize: "0.78rem", marginTop: "0.35rem", opacity: 0.85 }}>
                    Placed from street address via OpenStreetMap Nominatim.
                  </div>
                ) : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
