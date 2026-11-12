import { error } from "../../middleware/security.mjs";
export function oauthError(reason) {
  return Object.assign(error(400, "Không hoàn tất được kết nối LinkedIn."), {
    oauthReason: reason,
  });
}
export async function oauthJson(response) {
  try {
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw 0;
    return value;
  } catch {
    throw oauthError("provider_response");
  }
}
export const devHeaders = (key) => ({
  "api-key": key,
  Accept: "application/vnd.forem.api-v1+json",
  "Content-Type": "application/json",
});
export const linkedinHeaders = (env, token) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "LinkedIn-Version": env.LINKEDIN_API_VERSION || "202610",
  "X-Restli-Protocol-Version": "2.0.0",
});
