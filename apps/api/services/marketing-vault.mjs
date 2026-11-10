import { error } from "../middleware/security.mjs";
const encoder = new TextEncoder();
const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (str) => Uint8Array.from(atob(str), (ch) => ch.charCodeAt(0));
function keyMaterial(env, version) {
  const current = env.TOKEN_KEY_VERSION || "v1";
  const value =
    version === current
      ? env.TOKEN_ENCRYPTION_KEY
      : env.TOKEN_ENCRYPTION_KEY_PREVIOUS;
  if (version !== current && version !== env.TOKEN_KEY_VERSION_PREVIOUS)
    throw error(503, "Không tìm thấy phiên bản khóa bảo vệ kết nối.");
  try {
    const bytes = decode(value);
    if (bytes.length !== 32) throw 0;
    return bytes;
  } catch {
    throw error(503, "Chưa cấu hình TOKEN_ENCRYPTION_KEY (32 byte, base64).");
  }
}
export function vaultReady(env) {
  try {
    keyMaterial(env, env.TOKEN_KEY_VERSION || "v1");
    return true;
  } catch {
    return false;
  }
}
export async function seal(env, context, data) {
  const version = env.TOKEN_KEY_VERSION || "v1";
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial(env, version),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
    key,
    encoder.encode(JSON.stringify(data)),
  );
  return JSON.stringify({ version, iv: encode(iv), data: encode(ciphertext) });
}
export async function unseal(env, context, value) {
  const blob = JSON.parse(value);
  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial(env, blob.version),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: decode(blob.iv),
        additionalData: encoder.encode(context),
      },
      key,
      decode(blob.data),
    );
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    throw error(
      503,
      "Không giải mã được kết nối. Kiểm tra khóa bảo mật hoặc kết nối lại.",
    );
  }
}
export const credentialContext = (row) =>
  `${row.workspace_id}:${row.provider}:${row.id}`;
