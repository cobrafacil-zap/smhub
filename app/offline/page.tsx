// Página offline exibida pelo service worker quando não há rede.
// Autocontida (estilos inline, sem CSS/imagens externas) para renderizar
// mesmo sem os assets da app em cache.
export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #3D5AFE 0%, #0A1A40 100%)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            letterSpacing: "-2px",
            marginBottom: 20,
          }}
        >
          SM Hub
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>
          Você está offline
        </h1>
        <p style={{ color: "#B8C0E8", fontSize: 15, lineHeight: 1.5 }}>
          Sem conexão com a internet. Reconecte-se e tente novamente.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: 22,
            padding: "10px 20px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Tentar novamente
        </a>
      </div>
    </div>
  );
}