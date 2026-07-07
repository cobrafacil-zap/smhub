import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SM Hub — Plataforma para Agências de Marketing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem Open Graph dinâmica (1200x630) compartilhada em redes sociais.
 * Visual alinhado à identidade SM Hub: gradiente royal → navy.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "linear-gradient(135deg, #152285 0%, #0A1A40 55%, #060A14 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* halo decorativo */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 520,
            height: 520,
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(61,90,254,0.45), rgba(61,90,254,0) 70%)",
            display: "flex",
          }}
        />
        {/* badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 26,
            fontWeight: 600,
            color: "#B0BBFF",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #5E74FF, #3D5AFE)",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            SM
          </div>
          SM Hub
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              display: "flex",
            }}
          >
            A plataforma completa para agências de marketing
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#9AA6D6",
              maxWidth: 900,
              display: "flex",
            }}
          >
            Clientes, planejamento, relatórios, financeiro e contratos digitais
            em um só lugar.
          </div>
        </div>

        {/* rodapé / pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 9999,
              background: "rgba(61,90,254,0.18)",
              border: "1px solid rgba(135,151,255,0.4)",
              color: "#D9DEFF",
            }}
          >
            7 dias grátis · Sem cartão de crédito
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}