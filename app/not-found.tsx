import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo variant="full" />
        </div>
        <p className="text-7xl font-extrabold bg-gradient-to-r from-royal-400 to-royal-600 bg-clip-text text-transparent">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-100">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          A rota que você acessou não existe ou foi movida. Verifique o endereço
          ou volte ao início.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
