type DirectionsLocation = {
  address: string | null;
  district: { name: string; provinceName: string } | null;
};

// Owners cannot yet place a map pin, so directions search by the published
// business name and address. Without an address or district a search would
// only guess, so no link is offered.
export function directionsHref(
  businessName: string,
  location: DirectionsLocation,
) {
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
