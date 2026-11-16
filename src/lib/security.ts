import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export function encrypt(value: string) {
  const version = process.env.ENCRYPTION_KEY_VERSION || "1";
  const key = Buffer.from(process.env.ENCRYPTION_MASTER_KEY || "", "base64");
  if (key.length !== 32)
    throw new Error("Configure a 32-byte base64 ENCRYPTION_MASTER_KEY");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const content = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    version,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    content.toString("base64"),
  ].join(".");
}
export function decrypt(value: string) {
  const [version, iv, tag, content] = value.split(".");
  const raw =
    version === (process.env.ENCRYPTION_KEY_VERSION || "1")
      ? process.env.ENCRYPTION_MASTER_KEY
      : process.env[`ENCRYPTION_MASTER_KEY_V${version}`];
  const key = Buffer.from(raw || "", "base64");
  if (key.length !== 32) throw new Error("Encryption key unavailable");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(content, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
export function equalSecret(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_BASE_URL || request.url).origin;
  if (origin !== expected) throw new Error("Invalid request origin");
}
export function cleanHeader(value: string) {
  if (/[\r\n]/.test(value)) throw new Error("Invalid email header");
  return value;
}
