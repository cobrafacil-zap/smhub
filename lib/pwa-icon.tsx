/**
 * Ícone do app (PWA) — "SM" sobre o gradiente royal→navy, full-bleed.
 * Usado pelos route handlers de ícone (192/512/maskable) e pelo apple-icon.
 *
 * `maskable=true` deixa a fonte menor p/ ficar dentro da safe zone (80%) que
 * o Android recorta — o fundo preenche tudo (sem bordas transparentes).
 */
export function pwaIconGraphic(size: number, maskable = false) {
  const fontSize = maskable ? size * 0.34 : size * 0.46;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3D5AFE 0%, #0A1A40 100%)",
        color: "white",
        fontWeight: 800,
        fontSize,
        letterSpacing: `${-size * 0.02}px`,
        fontFamily: "sans-serif",
      }}
    >
      SM
    </div>
  );
}