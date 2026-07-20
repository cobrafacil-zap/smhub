import { ImageResponse } from "next/og";
import { pwaIconGraphic } from "@/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  // maskable: fundo full-bleed + "SM" menor dentro da safe zone (80%).
  return new ImageResponse(pwaIconGraphic(512, true), {
    width: 512,
    height: 512,
  });
}