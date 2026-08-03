import { divIcon, latLngBounds } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import type { RoutePlace } from "./transport-types";

type Props = { from: RoutePlace; to: RoutePlace; coordinates: Array<{ latitude: number; longitude: number }> };
const pin = (label: string) => divIcon({ className: "route-map-marker", html: `<span>${label}</span>`, iconSize: [34, 34], iconAnchor: [17, 34] });

function FitRoute({ coordinates }: Pick<Props, "coordinates">) {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 1) map.fitBounds(latLngBounds(coordinates.map(({ latitude, longitude }) => [latitude, longitude])), { padding: [32, 32] });
  }, [coordinates, map]);
  return null;
}

export function RouteMap({ from, to, coordinates }: Props) {
  const points = coordinates.map(({ latitude, longitude }) => [latitude, longitude] as [number, number]);
  return (
    <MapContainer center={[from.latitude, from.longitude]} className="route-map" scrollWheelZoom={false} zoom={12}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline color="#c56548" positions={points} weight={6} />
      <Marker icon={pin("A")} position={[from.latitude, from.longitude]}><Popup><strong>Start</strong><br />{from.label}</Popup></Marker>
      <Marker icon={pin("B")} position={[to.latitude, to.longitude]}><Popup><strong>Destination</strong><br />{to.label}</Popup></Marker>
      <FitRoute coordinates={coordinates} />
    </MapContainer>
  );
}
