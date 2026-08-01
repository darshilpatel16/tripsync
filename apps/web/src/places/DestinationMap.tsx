import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import type { Place } from "./place-types";

type Props = {
  center: { latitude: number; longitude: number };
  places: Place[];
};

const markerIcon = (category: Place["category"]) =>
  divIcon({
    className: "place-map-marker",
    html: `<span>${category === "RESTAURANT" ? "🍽️" : category === "CAFE" ? "☕" : category === "MUSEUM" ? "🏛️" : "📍"}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

export function DestinationMap({ center, places }: Props) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      className="destination-map"
      scrollWheelZoom={false}
      zoom={13}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <Marker icon={markerIcon(place.category)} key={place.id} position={[place.latitude, place.longitude]}>
          <Popup><strong>{place.name}</strong><br />{place.address ?? place.category.toLowerCase()}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
