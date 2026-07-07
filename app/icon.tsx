import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon dinâmico — "S" + "M" em gradiente royal → navy
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 18,
          background: "linear-gradient(135deg, #3D5AFE 0%, #0A1A40 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          letterSpacing: "-0.5px",
          borderRadius: 6,
        }}
      >
        SM
      </div>
    ),
    { ...size }
  );
}
