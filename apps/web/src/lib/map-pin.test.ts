import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mapEmbedHref,
  mapPreviewHref,
  parseMapPin,
  toCoordinates,
} from "./map-pin.ts";

const kitwe = { latitude: -12.8024, longitude: 28.2132 };

test("reads plain coordinates", () => {
  for (const input of [
    "-12.8024, 28.2132",
    " -12.8024,28.2132 ",
    "-12.8024 28.2132",
  ])
    assert.deepEqual(parseMapPin(input), {
      status: "ok",
      coordinates: kitwe,
    });
});

test("reads full Google Maps links", () => {
  for (const input of [
    "https://www.google.com/maps/@-12.8024,28.2132,17z",
    "https://www.google.com/maps/search/?api=1&query=-12.8024,28.2132",
    "https://maps.google.com/?q=-12.8024%2C28.2132",
    "https://www.google.com/maps/place/-12.8024,28.2132",
  ])
    assert.deepEqual(parseMapPin(input), {
      status: "ok",
      coordinates: kitwe,
    });
});

test("prefers the dropped pin over the map view", () => {
  assert.deepEqual(
    parseMapPin(
      "https://www.google.com/maps/place/Shop/@-12.9,28.1,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-12.8024!4d28.2132",
    ),
    { status: "ok", coordinates: kitwe },
  );
});

test("corrects swapped coordinates and rounds", () => {
  assert.deepEqual(toCoordinates(28.21321234, -12.80241234), {
    status: "ok",
    coordinates: { latitude: -12.802412, longitude: 28.213212 },
  });
});

test("accepts border towns and rejects places outside Zambia", () => {
  assert.equal(parseMapPin("-13.6333, 32.6500").status, "ok"); // Chipata
  assert.equal(parseMapPin("-8.8340, 31.3796").status, "ok"); // Mbala
  const nairobi = parseMapPin("-1.2921, 36.8219");
  assert.equal(nairobi.status, "error");
  assert.equal(parseMapPin("0, 0").status, "error");
});

test("explains unreadable input", () => {
  const short = parseMapPin("https://maps.app.goo.gl/abc123");
  assert.equal(short.status, "error");
  assert.match(
    short.status === "error" ? short.message : "",
    /Short map links/,
  );
  assert.equal(parseMapPin("").status, "error");
  assert.equal(parseMapPin("near the market").status, "error");
});

test("previews a pin on the map", () => {
  assert.equal(
    mapPreviewHref(kitwe),
    "https://www.google.com/maps/search/?api=1&query=-12.8024,28.2132",
  );
});

test("embeds a map centred on the pin", () => {
  const url = new URL(mapEmbedHref(kitwe));
  assert.equal(url.origin, "https://www.openstreetmap.org");
  assert.equal(url.searchParams.get("marker"), "-12.8024,28.2132");
  assert.equal(
    url.searchParams.get("bbox"),
    "28.208200,-12.807400,28.218200,-12.797400",
  );
});
