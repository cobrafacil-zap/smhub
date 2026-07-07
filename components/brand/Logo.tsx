import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
  /** Cor do "Hub" — útil em landing light vs. dark app. */
  textColor?: string;
}

/**
 * Logo SM Hub.
 *   - `full`   → carrega /logo-full.svg (símbolo + texto). Editável trocando o arquivo.
 *   - `mark`   → SVG inline (ícone compacto p/ favicon, sidebar pequena).
 */
export function Logo({
  variant = "full",
  className,
  textColor,
}: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-10 w-10", className)}
        aria-label="SM Hub"
      >
        <defs>
          <linearGradient id="smhub-mark-sgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5045E5" />
            <stop offset="100%" stopColor="#3D5AFE" />
          </linearGradient>
        </defs>
        <path d="M 18 40 A 32 32 0 0 1 82 40" stroke="#3D5AFE" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path
          d="M 30 28 Q 22 22 30 18 Q 44 14 56 22 Q 66 30 56 40 Q 46 48 36 52 Q 24 56 22 66 Q 22 80 38 84 Q 56 88 72 78"
          stroke="url(#smhub-mark-sgrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M 30 28 L 30 84 L 40 84 L 40 50 L 50 70 L 60 50 L 60 84 L 70 84 L 70 28 L 60 28 L 50 50 L 40 28 Z"
          fill="#0A1A40"
        />
        <path d="M 22 66 A 28 28 0 0 0 78 66" stroke="#0A1A40" strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // full → usa arquivo SVG (editável em /public/logo-full.svg)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-full.svg"
      alt="SM Hub"
      className={cn("h-10 w-auto", className)}
      style={textColor ? { filter: undefined } : undefined}
    />
  );
}
