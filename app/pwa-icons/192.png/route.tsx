import { ImageResponse } from "next/og";
import { pwaIconGraphic } from "@/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(pwaIconGraphic(192, false), {
    width: 192,
    height: 192,
  });
}