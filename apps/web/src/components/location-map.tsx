import type { LocationCoordinates } from "@zed360/contracts";
import { mapEmbedHref } from "@/lib/map-pin";

export function LocationMap({
  coordinates,
  label,
}: {
  coordinates: LocationCoordinates;
  label: string;
}) {
  return (
    <iframe
      className="aspect-[4/3] w-full rounded-2xl border border-white/10 bg-white/5"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={mapEmbedHref(coordinates)}
      title={`Map showing ${label}`}
    />
  );
}
