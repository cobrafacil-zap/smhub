"use client";
import { RouteError } from "@/components/ui/RouteError";
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} titulo="o formulário de lançamento" escopo="admin/financeiro/novo" />;
}
