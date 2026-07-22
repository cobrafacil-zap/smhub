// SERVER-ONLY — não importar em client components (usa node:crypto).
import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHmac,
  timingSafeEqual as nodeTimingSafeEqual,
} from "node:crypto";

/**
 * Criptografia e assinatura server-side para a integração Meta (Instagram/Facebook).
 *
 * - `encryptToken` / `decryptToken`: tokens OAuth cifrados em repouso com
 *   AES-256-GCM (chave TOKEN_ENCRYPTION_KEY, base64 de 32 bytes).
 * - `signState` / `verifyState`: parametro `state` do OAuth, HMAC-SHA256 com
 *   CONTRACT_HASH_SECRET (mesma chave usada em lib/hash.ts), com expiração.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY ausente. Gere com: openssl rand -base64 32"
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY deve decodificar (base64) para 32 bytes.");
  }
  return key;
}

function getStateSecret(): string {
  return process.env.CONTRACT_HASH_SECRET ?? "sm-hub-dev-secret-change-me";
}

/* -------------------------------------------------------------------------- */
/* Cifragem de tokens (AES-256-GCM)                                           */
/* -------------------------------------------------------------------------- */

export interface EncryptedToken {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptToken(plaintext: string): EncryptedToken {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptToken(ciphertext: string, iv: string, tag: string): string {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGO, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/**
 * Cifra uma string num único blob base64 ("iv.tag.ciphertext") — prático pra
 * guardar em cookie HTTP-only de curta duração (ex.: seleção de conta Meta).
 */
export function encryptString(plaintext: string): string {
  const { ciphertext, iv, tag } = encryptToken(plaintext);
  return `${iv}.${tag}.${ciphertext}`;
}

/** Decifra um blob produzido por `encryptString`. Lança se inválido. */
export function decryptString(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 3) throw new Error("blob cifrado inválido.");
  const [iv, tag, ciphertext] = parts;
  return decryptToken(ciphertext, iv, tag);
}

/* -------------------------------------------------------------------------- */
/* Assinatura do parametro `state` do OAuth (HMAC)                            */
/* -------------------------------------------------------------------------- */

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export interface StatePayload {
  clienteId: string;
  provider: "instagram" | "facebook";
  agenciaId: string;
  userId: string;
  nonce: string;
  exp: number; // epoch ms
}

/**
 * Assina um payload para o parametro `state` do OAuth.
 * Formato: base64url(payloadJson).base64url(hmac)
 */
export function signState(
  payload: Omit<StatePayload, "nonce" | "exp">,
  maxAgeMs: number
): string {
  const full: StatePayload = {
    ...payload,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + maxAgeMs,
  };
  const body = base64url(Buffer.from(JSON.stringify(full), "utf8"));
  const sig = base64url(
    Buffer.from(createHmac("sha256", getStateSecret()).update(body).digest())
  );
  return `${body}.${sig}`;
}

/**
 * Verifica assinatura e expiração. Retorna o payload ou null se inválido/expirado.
 */
export function verifyState(token: string): StatePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = base64url(
    Buffer.from(createHmac("sha256", getStateSecret()).update(body).digest())
  );
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!nodeTimingSafeEqual(sigBuf, expBuf)) return null;
  let payload: StatePayload;
  try {
    payload = JSON.parse(base64urlDecode(body).toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
  return payload;
}