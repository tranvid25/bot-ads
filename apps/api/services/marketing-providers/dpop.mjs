import { b64 } from "./encoding.mjs";
import { strB64 } from "./encoding.mjs";
import { providerFetch } from "./http.mjs";
export async function createDPoPProof(
  privateJwkOrKey,
  publicJwk,
  htm,
  htu,
  nonce = null,
  accessToken = null,
) {
  let privateKey = privateJwkOrKey;
  if (!privateKey?.type) {
    privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJwkOrKey,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["sign"],
    );
  }
  const cleanPublicJwk = {
    kty: publicJwk.kty,
    crv: publicJwk.crv,
    x: publicJwk.x,
    y: publicJwk.y,
  };
  const header = {
    alg: "ES256",
    typ: "dpop+jwt",
    jwk: cleanPublicJwk,
  };
  const payload = {
    jti: crypto.randomUUID(),
    htm,
    htu: htu.split("?")[0].split("#")[0],
    iat: Math.floor(Date.now() / 1000),
  };
  if (nonce) payload.nonce = nonce;
  if (accessToken)
    payload.ath = b64(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(accessToken),
      ),
    );
  const headerB64 = strB64(JSON.stringify(header));
  const payloadB64 = strB64(JSON.stringify(payload));
  const toSign = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    privateKey,
    toSign,
  );
  return `${headerB64}.${payloadB64}.${b64(sig)}`;
}
export async function fetchWithDPoP(
  env,
  url,
  options = {},
  privateJwkOrKey,
  publicJwk,
  accessToken = null,
) {
  const method = (options.method || "GET").toUpperCase();
  let nonce = options.nonce || null;
  let dpop = await createDPoPProof(
    privateJwkOrKey,
    publicJwk,
    method,
    url,
    nonce,
    accessToken,
  );
  const headers = new Headers(options.headers || {});
  headers.set("DPoP", dpop);
  if (accessToken) {
    headers.set("Authorization", `DPoP ${accessToken}`);
  }
  let res = await providerFetch(env, url, {
    ...options,
    headers,
  });
  if (res.status === 400 || res.status === 401) {
    const serverNonce = res.headers.get("dpop-nonce");
    if (serverNonce && serverNonce !== nonce) {
      dpop = await createDPoPProof(
        privateJwkOrKey,
        publicJwk,
        method,
        url,
        serverNonce,
        accessToken,
      );
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("DPoP", dpop);
      if (accessToken) {
        retryHeaders.set("Authorization", `DPoP ${accessToken}`);
      }
      res = await providerFetch(env, url, {
        ...options,
        headers: retryHeaders,
      });
    }
  }
  return res;
}
