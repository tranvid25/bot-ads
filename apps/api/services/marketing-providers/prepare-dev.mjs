import { devHeaders } from "./oauth.mjs";
export async function prepareDev(env, account, credential, variant, image) {
  let prepared;
  const token = credential.accessToken;
  prepared = {
    url: "https://dev.to/api/articles",
    headers: devHeaders(credential.apiKey),
    body: {
      article: {
        title: variant.title,
        body_markdown: variant.content,
        published: true,
        tags: variant.tags,
        ...(variant.canonicalUrl
          ? {
              canonical_url: variant.canonicalUrl,
            }
          : {}),
        ...(image
          ? {
              main_image: image.url,
            }
          : {}),
      },
    },
  };
  return prepared;
}
