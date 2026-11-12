import { linkedinHeaders } from "./oauth.mjs";
import { PublishError } from "./http.mjs";
import { providerFetch } from "./http.mjs";
import { requireSuccess } from "./http.mjs";
export async function prepareLinkedin(
  env,
  account,
  credential,
  variant,
  image,
) {
  let prepared;
  const token = credential.accessToken;
  let content;
  if (image) {
    const init = await requireSuccess(
      await providerFetch(
        env,
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        {
          method: "POST",
          headers: linkedinHeaders(env, token),
          body: JSON.stringify({
            initializeUploadRequest: {
              owner: account.actor_id,
            },
          }),
        },
      ),
    );
    const result = (await init.json()).value;
    const uploadUrl = new URL(result?.uploadUrl);
    if (
      uploadUrl.protocol !== "https:" ||
      uploadUrl.username ||
      uploadUrl.password ||
      !(
        uploadUrl.hostname === "linkedin.com" ||
        uploadUrl.hostname.endsWith(".linkedin.com")
      ) ||
      !/^urn:li:image:/.test(result?.image || "")
    )
      throw new PublishError("LinkedIn trả đường dẫn tải ảnh không hợp lệ.");
    await requireSuccess(
      await providerFetch(env, uploadUrl.href, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": image.mime,
        },
        body: image.bytes,
      }),
    );
    content = {
      media: {
        id: result.image,
        altText: variant.title,
      },
    };
  }
  prepared = {
    url: "https://api.linkedin.com/rest/posts",
    headers: linkedinHeaders(env, token),
    body: {
      author: account.actor_id,
      commentary: variant.content,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
      ...(content
        ? {
            content,
          }
        : {}),
    },
  };
  return prepared;
}
