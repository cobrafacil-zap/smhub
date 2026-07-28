import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SM Hub — Plataforma para Agências de Marketing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem Open Graph dinâmica (1200x630) compartilhada em redes sociais.
 * Visual alinhado à identidade SM Hub: gradiente violeta → roxo profundo.
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
            "linear-gradient(135deg, #4C1D95 0%, #1E1B4B 55%, #0F0A1A 100%)",
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
              "radial-gradient(circle, rgba(139,92,246,0.45), rgba(139,92,246,0) 70%)",
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
            color: "#DDD6FE",
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
              background: "linear-gradient(135deg, #A78BFA, #7C3AED)",
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
              color: "#C4B5FD",
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
              background: "rgba(124,58,214,0.18)",
              border: "1px solid rgba(167,139,250,0.4)",
              color: "#EDE9FE",
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