import { PublishError } from "./http.mjs";
import { providerFetch } from "./http.mjs";
import { requireSuccess } from "./http.mjs";
import { prepareDev } from "./prepare-dev.mjs";
import { prepareLinkedin } from "./prepare-linkedin.mjs";
import { prepareBluesky } from "./prepare-bluesky.mjs";
export async function publishToProvider(
  env,
  account,
  credential,
  variant,
  { image, beforeSubmit },
) {
  let prepared;
  const token = credential.accessToken;
  try {
    const prepare = {
      dev: prepareDev,
      linkedin: prepareLinkedin,
      bluesky: prepareBluesky,
    }[account.provider];
    if (!prepare) throw new PublishError("Kênh này cần đăng thủ công.");
    prepared = await prepare(env, account, credential, variant, image);
  } catch (e) {
    if (e instanceof PublishError) throw e;
    throw new PublishError(
      "Không chuẩn bị được nội dung hoặc ảnh. Chưa gửi bài; có thể thử lại.",
    );
  }
  await beforeSubmit();
  let response;
  try {
    response = await providerFetch(env, prepared.url, {
      method: "POST",
      headers: prepared.headers,
      body: JSON.stringify(prepared.body),
    });
  } catch {
    throw new PublishError(
      "Mất kết nối trong lúc gửi bài. Kiểm tra trên nền tảng trước khi gửi lại.",
      "unknown",
    );
  }
  await requireSuccess(response, true);
  try {
    if (account.provider === "dev") {
      const result = await response.json();
      const url = new URL(result.url);
      if (!result.id || url.protocol !== "https:" || url.hostname !== "dev.to")
        throw 0;
      return {
        remoteId: String(result.id),
        permalink: url.href,
      };
    }
    if (account.provider === "bluesky") {
      const result = await response.json();
      const rkey = result.uri?.split("/").pop() || "";
      const handle =
        credential.handle || account.name.replace(/^@/, "") || "user";
      return {
        remoteId: result.uri || result.cid || "",
        permalink: `https://bsky.app/profile/${handle}/post/${rkey}`,
      };
    }
    const remoteId = response.headers.get("x-restli-id");
    if (!/^urn:li:(share|ugcPost):[0-9]+$/.test(remoteId || "")) throw 0;
    return {
      remoteId,
      permalink: `https://www.linkedin.com/feed/update/${encodeURIComponent(remoteId)}/`,
    };
  } catch {
    throw new PublishError(
      "Nền tảng đã nhận yêu cầu nhưng thiếu ID/link xác nhận. Không tự gửi lại.",
      "unknown",
    );
  }
}
