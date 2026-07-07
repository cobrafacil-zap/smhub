import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { XCircle } from "lucide-react";

export const metadata = { title: "Pagamento não concluído" };

export default function CheckoutFalhaPage() {
  return (
    <div className="min-h-screen bg-bg text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <Logo variant="full" className="!h-8" />
        </div>
        <Card>
          <div className="text-center">
            <XCircle className="h-10 w-10 text-danger-400 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-slate-100">Pagamento não concluído</h1>
            <p className="text-sm text-slate-400 mt-2">
              Não conseguimos processar seu pagamento. Nenhuma cobrança foi efetuada.
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Você pode tentar novamente com outro método de pagamento.
            </p>
            <div className="mt-6 space-y-2">
              <Link
                href="/"
                className="block w-full text-center bg-gradient-to-r from-royal-500 to-royal-700 text-white font-medium rounded-lg py-2.5 hover:from-royal-400 hover:to-royal-600"
              >
                Voltar para a página inicial
              </Link>
              <Link
                href="/checkout?plano=pro"
                className="block w-full text-center bg-bg-elevated border border-border text-slate-200 font-medium rounded-lg py-2.5 hover:bg-bg-muted"
              >
                Tentar novamente
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
