import { createDPoPProof } from "./dpop.mjs";
import { providerFetch } from "./http.mjs";
export async function prepareBluesky(env, account, credential, variant, image) {
  let prepared;
  const token = credential.accessToken;
  let sessionToken = credential.accessJwt || credential.tokenData?.access_token;
  let dpopProof = null;
  if (
    credential.authMode === "oauth" &&
    credential.privateJwk &&
    credential.publicJwk
  ) {
    sessionToken = credential.tokenData?.access_token;
    dpopProof = await createDPoPProof(
      credential.privateJwk,
      credential.publicJwk,
      "POST",
      "https://bsky.social/xrpc/com.atproto.repo.createRecord",
      null,
      sessionToken,
    );
  } else if (credential.handle && credential.appPassword) {
    try {
      const fresh = await providerFetch(
        env,
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: credential.handle,
            password: credential.appPassword,
          }),
        },
      );
      if (fresh.ok) {
        const fData = await fresh.json();
        sessionToken = fData.accessJwt;
      }
    } catch {}
  }
  let embed;
  if (image?.bytes && image?.mime) {
    try {
      const blobHeaders = {
        "Content-Type": image.mime,
      };
      if (
        credential.authMode === "oauth" &&
        credential.privateJwk &&
        credential.publicJwk
      ) {
        blobHeaders["Authorization"] = `DPoP ${sessionToken}`;
        blobHeaders["DPoP"] = await createDPoPProof(
          credential.privateJwk,
          credential.publicJwk,
          "POST",
          "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
          null,
          sessionToken,
        );
      } else {
        blobHeaders["Authorization"] = `Bearer ${sessionToken}`;
      }
      const blobRes = await providerFetch(
        env,
        "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
        {
          method: "POST",
          headers: blobHeaders,
          body: image.bytes,
        },
      );
      if (blobRes.ok) {
        const bData = await blobRes.json();
        if (bData.blob) {
          embed = {
            $type: "app.bsky.embed.images",
            images: [
              {
                alt: variant.title || "",
                image: bData.blob,
              },
            ],
          };
        }
      }
    } catch {}
  }
  const text =
    (variant.title ? `${variant.title}\n\n` : "") + (variant.content || "");
  const record = {
    $type: "app.bsky.feed.post",
    text: text.slice(0, 3000),
    createdAt: new Date().toISOString(),
    ...(embed
      ? {
          embed,
        }
      : {}),
  };
  const postHeaders = {
    "Content-Type": "application/json",
  };
  if (dpopProof) {
    postHeaders["Authorization"] = `DPoP ${sessionToken}`;
    postHeaders["DPoP"] = dpopProof;
  } else {
    postHeaders["Authorization"] = `Bearer ${sessionToken}`;
  }
  prepared = {
    url: "https://bsky.social/xrpc/com.atproto.repo.createRecord",
    headers: postHeaders,
    body: {
      repo: credential.did || account.actor_id,
      collection: "app.bsky.feed.post",
      record,
    },
  };
  return prepared;
}
