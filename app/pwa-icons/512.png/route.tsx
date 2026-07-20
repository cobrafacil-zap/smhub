import { ImageResponse } from "next/og";
import { pwaIconGraphic } from "@/lib/pwa-icon";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(pwaIconGraphic(512, false), {
    width: 512,
    height: 512,
  });
}