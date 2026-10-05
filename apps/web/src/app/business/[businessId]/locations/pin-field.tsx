"use client";

import type { LocationCoordinates } from "@zed360/contracts";
import { useId, useState } from "react";
import { LocationMap } from "@/components/location-map";
import { mapPreviewHref, parseMapPin, toCoordinates } from "@/lib/map-pin";

export function PinField({ initial }: { initial: LocationCoordinates | null }) {
  const [pin, setPin] = useState(initial);
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const pastedId = useId();

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage(
        "This device cannot share its location. Paste coordinates instead.",
      );
      return;
    }
    setLocating(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const result = toCoordinates(coords.latitude, coords.longitude);
        if (result.status === "error") return setMessage(result.message);
        setPin(result.coordinates);
        setMessage(
          coords.accuracy > 100
            ? `Pin set, but only accurate to about ${Math.round(coords.accuracy)} m. Check it on the map.`
            : "Pin set from your current location. Save changes to publish it.",
        );
      },
      (error) => {
        setLocating(false);
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location access was blocked. Allow it in your browser, or paste coordinates."
            : "Your location could not be found. Try again outside, or paste coordinates.",
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const applyPasted = () => {
    const result = parseMapPin(pasted);
    if (result.status === "error") return setMessage(result.message);
    setPin(result.coordinates);
    setPasted("");
    setMessage("Pin set. Save changes to publish it.");
  };

  return (
    <fieldset className="grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
      <legend className="px-1 text-sm text-white/65">Map pin</legend>
      <input name="latitude" type="hidden" value={pin?.latitude ?? ""} />
      <input name="longitude" type="hidden" value={pin?.longitude ?? ""} />
      <p className="text-xs leading-5 text-white/50">
        Gives customers exact directions. Only pin a place customers should
        visit. If you travel to customers from home, leave this empty.
      </p>
      {pin ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[var(--lime)]">
            📍 {pin.latitude}, {pin.longitude}
          </span>
          <a
            className="text-xs font-semibold text-white/65 underline hover:text-white"
            href={mapPreviewHref(pin)}
            rel="noreferrer"
            target="_blank"
          >
            Check on map ↗
          </a>
          <button
            className="text-xs font-semibold text-white/65 underline hover:text-white"
            onClick={() => {
              setPin(null);
              setMessage("Pin removed. Save changes to publish this.");
            }}
            type="button"
          >
            Remove pin
          </button>
        </div>
      ) : (
        <p className="text-sm text-white/50">
          No pin yet. Customers see no map for this location until you set one.
        </p>
      )}
      {pin ? (
        <LocationMap
          coordinates={pin}
          key={`${pin.latitude},${pin.longitude}`}
          label="the pin you set"
        />
      ) : null}
      <button
        className="button button-secondary w-fit"
        disabled={locating}
        onClick={useCurrentLocation}
        type="button"
      >
        {locating ? "Finding your location…" : "Use my current location"}
      </button>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={pastedId}>
          Coordinates or Google Maps link
        </label>
        <input
          className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 text-sm"
          id={pastedId}
          onChange={(event) => setPasted(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyPasted();
            }
          }}
          placeholder="Or paste coordinates or a Google Maps link"
          value={pasted}
        />
        <button
          className="button button-quiet"
          disabled={!pasted.trim()}
          onClick={applyPasted}
          type="button"
        >
          Set pin
        </button>
      </div>
      {message ? (
        <p aria-live="polite" className="text-xs leading-5 text-white/60">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
