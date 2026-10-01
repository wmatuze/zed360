type DirectionsLocation = {
  address: string | null;
  coordinates: { latitude: number; longitude: number } | null;
  district: { name: string; provinceName: string } | null;
};

// A map pin set by the owner gives exact directions. Without one, search by
// the published business name and address; without an address or district a
// search would only guess, so no link is offered.
export function directionsHref(
  businessName: string,
  location: DirectionsLocation,
) {
  if (location.coordinates) {
    const { latitude, longitude } = location.coordinates;
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }
  if (!location.address?.trim() && !location.district) return null;
  const query = [
    businessName,
    location.address?.trim(),
    location.district?.name,
    location.district?.provinceName,
    "Zambia",
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
