import { cookieHeader } from "../../middleware/security.mjs";
import { appOrigin } from "../marketing.controller.mjs";
export const fail = (reason) =>
  Object.assign(new Error("Google authentication failed"), {
    reason,
  });
export const readCookie = (request, name) =>
  (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
export function googleReady(env) {
  try {
    return Boolean(
      appOrigin(env) &&
      env.GOOGLE_CLIENT_ID?.trim() &&
      env.GOOGLE_CLIENT_SECRET?.trim() &&
      env.AUTH_SECRET?.length >= 32,
    );
  } catch {
    return false;
  }
}
export function browserCookie(origin, value, age = 600) {
  return `botads_google=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${origin.startsWith("https:") ? "; Secure" : ""}`;
}
export function redirect(env, reason, session, picture) {
  const origin = appOrigin(env);
  const picParam = picture ? `&avatar=${encodeURIComponent(picture)}` : "";
  const headers = new Headers({
    Location: `${origin}/?google_auth=${reason}${picParam}`,
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  });
  headers.append("Set-Cookie", browserCookie(origin, "", 0));
  if (session)
    headers.append("Set-Cookie", cookieHeader(new Request(origin), session));
  return new Response(null, {
    status: 303,
    headers,
  });
}
