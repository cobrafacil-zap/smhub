import { createHash, createHmac } from "node:crypto";

/**
 * Hash SHA-256 puro de uma string.
 */
export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * HMAC SHA-256 usando o CONTRACT_HASH_SECRET.
 * Use para gerar hashes de assinatura de contratos (valor jurídico probatório).
 */
export function hmacSha256(payload: string): string {
  const secret = process.env.CONTRACT_HASH_SECRET ?? "sm-hub-dev-secret-change-me";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Gera hash de assinatura de um contrato.
 *
 * @param contratoId  ID do contrato
 * @param clienteId   ID do cliente
 * @param ip          IP de quem assinou
 * @param userAgent   User-agent
 * @param data        ISO timestamp da assinatura
 * @returns           HMAC SHA-256 hex
 */
export function buildContractSignatureHash(params: {
  contratoId: string;
  clienteId: string;
  ip: string;
  userAgent: string;
  data: string;
}): string {
  const payload = [
    params.contratoId,
    params.clienteId,
    params.ip,
    params.userAgent,
    params.data,
  ].join("|");
  return hmacSha256(payload);
}
