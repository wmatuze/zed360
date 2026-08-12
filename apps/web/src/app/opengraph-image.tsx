import { ImageResponse } from "next/og";

export const alt = "Zed360 — Find the right business in Zambia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0b0d12",
        color: "white",
        display: "flex",
        height: "100%",
        justifyContent: "space-between",
        padding: "76px 88px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#b8f238",
          borderRadius: 999,
          filter: "blur(110px)",
          height: 360,
          opacity: 0.13,
          position: "absolute",
          right: -40,
          top: -80,
          width: 360,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", width: 760 }}>
        <div style={{ alignItems: "center", display: "flex", gap: 24 }}>
          <div
            style={{
              alignItems: "center",
              background: "#b8f238",
              borderRadius: 22,
              color: "#0b0d12",
              display: "flex",
              fontSize: 52,
              fontWeight: 800,
              height: 88,
              justifyContent: "center",
              transform: "rotate(-4deg)",
              width: 88,
            }}
          >
            Z
          </div>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 750 }}>
            Zed<span style={{ color: "#b8f238" }}>360</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 760,
            letterSpacing: "-3px",
            lineHeight: 1.03,
            marginTop: 54,
          }}
        >
          Find the right business in Zambia.
        </div>
        <div
          style={{
            color: "rgba(255,255,255,.6)",
            display: "flex",
            fontSize: 27,
            lineHeight: 1.4,
            marginTop: 30,
          }}
        >
          Post a need, compare current responses, or browse trusted business
          profiles.
        </div>
      </div>
      <div
        style={{
          border: "1px solid rgba(184,242,56,.28)",
          borderRadius: 999,
          color: "#b8f238",
          display: "flex",
          fontSize: 22,
          padding: "17px 25px",
        }}
      >
        Built for Zambia
      </div>
    </div>,
    size,
  );
}
