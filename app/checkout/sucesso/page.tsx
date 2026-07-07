import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { CheckStatusPolling } from "./CheckStatusPolling";

export const metadata = { title: "Pagamento aprovado" };

export default function CheckoutSucessoPage() {
  return (
    <div className="min-h-screen bg-bg text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo variant="full" className="!h-8" />
        </div>
        <Card>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-100">Pagamento aprovado!</h1>
            <p className="text-sm text-slate-400 mt-1">
              Estamos processando sua assinatura. Isso leva apenas alguns segundos.
            </p>
            <div className="mt-6">
              <Suspense fallback={<div className="text-slate-500 text-sm">Carregando...</div>}>
                <CheckStatusPolling />
              </Suspense>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
