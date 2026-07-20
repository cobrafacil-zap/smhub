import { ImageResponse } from "next/og";
import { pwaIconGraphic } from "@/lib/pwa-icon";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // Apple-touch-icon: full-bleed (sem cantos arredondados/transparentes —
  // o iOS aplica o mask sozinho).
  return new ImageResponse(pwaIconGraphic(180, false), { ...size });
}