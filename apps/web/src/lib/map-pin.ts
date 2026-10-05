import {
  locationCoordinatesSchema,
  zambiaBounds,
  type LocationCoordinates,
} from "@zed360/contracts";

type PinResult =
  | { status: "ok"; coordinates: LocationCoordinates }
  | { status: "error"; message: string };

const number = String.raw`[-+]?\d{1,3}(?:\.\d+)?`;

// Google Maps puts a dropped pin's exact position in !3d…!4d…; the @lat,lng
// part is only the map view, so the pin wins when both are present.
const patterns = [
  new RegExp(`!3d(${number})!4d(${number})`),
  new RegExp(`[?&](?:q|query|ll|destination)=(${number}),\\s*(${number})`),
  new RegExp(`/place/(${number}),\\s*(${number})`),
  new RegExp(`@(${number}),(${number})`),
  new RegExp(`^\\s*(${number})\\s*[,\\s]\\s*(${number})\\s*$`),
];

const within = (value: number, range: { minimum: number; maximum: number }) =>
  value >= range.minimum && value <= range.maximum;

// Six decimal places is about ten centimetres, more than a pin needs.
const rounded = (value: number) => Math.round(value * 1e6) / 1e6;

export function toCoordinates(latitude: number, longitude: number): PinResult {
  // Swapped values are a common copy mistake and are unambiguous in Zambia.
  if (
    !within(latitude, zambiaBounds.latitude) &&
    within(latitude, zambiaBounds.longitude) &&
    within(longitude, zambiaBounds.latitude)
  )
    [latitude, longitude] = [longitude, latitude];
  const parsed = locationCoordinatesSchema.safeParse({
    latitude: rounded(latitude),
    longitude: rounded(longitude),
  });
  return parsed.success
    ? { status: "ok", coordinates: parsed.data }
    : { status: "error", message: "The map pin must be inside Zambia." };
}

export function parseMapPin(input: string): PinResult {
  let text = input.trim();
  if (!text)
    return { status: "error", message: "Paste coordinates or a map link." };
  try {
    text = decodeURIComponent(text);
  } catch {
    // Keep the original text when it is not URL-encoded.
  }
  if (/^https?:\/\/(maps\.app\.goo\.gl|goo\.gl)\//i.test(text))
    return {
      status: "error",
      message:
        "Short map links cannot be read. Open the link, then copy the coordinates shown on the pin.",
    };
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return toCoordinates(Number(match[1]), Number(match[2]));
  }
  return {
    status: "error",
    message:
      "Use coordinates such as -12.8024, 28.2132 or a full Google Maps link.",
  };
}

export function mapPreviewHref({ latitude, longitude }: LocationCoordinates) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

// OpenStreetMap's embeddable map needs no API key. The box is roughly a
// kilometre across, close enough to recognise the surrounding streets.
export function mapEmbedHref({ latitude, longitude }: LocationCoordinates) {
  const span = 0.005;
  const box = [
    longitude - span,
    latitude - span,
    longitude + span,
    latitude + span,
  ]
    .map((value) => value.toFixed(6))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${box}&layer=mapnik&marker=${latitude},${longitude}`;
}
