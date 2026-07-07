import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Card } from "@/components/ui/Card";
import { Clock } from "lucide-react";

export const metadata = { title: "Pagamento pendente" };

export default function CheckoutPendentePage() {
  return (
    <div className="min-h-screen bg-bg text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-8">
          <Logo variant="full" className="!h-8" />
        </div>
        <Card>
          <div className="text-center">
            <Clock className="h-10 w-10 text-warning-400 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-slate-100">Pagamento pendente</h1>
            <p className="text-sm text-slate-400 mt-2">
              Recebemos seu pedido e estamos aguardando a confirmação do pagamento.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-bg-elevated/50 text-xs text-slate-300 text-left">
              <p><strong>Boleto:</strong> pode levar até 3 dias úteis.</p>
              <p className="mt-1"><strong>PIX:</strong> a confirmação costuma ser instantânea.</p>
            </div>
            <p className="text-sm text-slate-400 mt-3">
              Assim que o pagamento for confirmado, sua conta será ativada automaticamente
              e você receberá um e-mail com as instruções de acesso.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="block w-full text-center bg-bg-elevated border border-border text-slate-200 font-medium rounded-lg py-2.5 hover:bg-bg-muted"
              >
                Voltar para a página inicial
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
