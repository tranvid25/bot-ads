import { dashboard } from "./marketing/dashboard.mjs";
import { dispatch } from "./marketing/dispatch.mjs";
import { brands } from "./marketing/brands.mjs";
import { connectDev } from "./marketing/connectDev.mjs";
import { connectBluesky } from "./marketing/connectBluesky.mjs";
import { connectManual } from "./marketing/connectManual.mjs";
import { linkedinStart } from "./marketing/linkedinStart.mjs";
import { blueskyStart } from "./marketing/blueskyStart.mjs";
import { disconnectChannel } from "./marketing/disconnectChannel.mjs";
import { postSave } from "./marketing/postSave.mjs";
import { postApprove } from "./marketing/postApprove.mjs";
import { postSchedule } from "./marketing/postSchedule.mjs";
import { publicationCancel } from "./marketing/publicationCancel.mjs";
import { publicationConfirm } from "./marketing/publicationConfirm.mjs";
import { publicationRetry } from "./marketing/publicationRetry.mjs";
import { publicationNotPosted } from "./marketing/publicationNotPosted.mjs";
import { publicationMetrics } from "./marketing/publicationMetrics.mjs";
import { rate, error } from "../middleware/security.mjs";
export {
  appOrigin,
  blueskyOAuthClientId,
  marketingCapabilities,
  blueskyClientMetadata,
} from "./marketing/config.mjs";
export { linkedinCallback } from "./marketing/linkedinCallback.mjs";
export { blueskyCallback } from "./marketing/blueskyCallback.mjs";
export { marketingMedia } from "./marketing/marketingMedia.mjs";
export async function marketingRoute(request, env, context, execution) {
  const read = await dashboard(request, env, context, execution);
  if (read) return read;
  await rate(env, "marketing:" + context.workspaceId, 120, 3600);
  for (const handler of [
    dispatch,
    brands,
    connectDev,
    connectBluesky,
    connectManual,
    linkedinStart,
    blueskyStart,
    disconnectChannel,
    postSave,
    postApprove,
    postSchedule,
    publicationCancel,
    publicationConfirm,
    publicationRetry,
    publicationNotPosted,
    publicationMetrics,
  ]) {
    const response = await handler(request, env, context, execution);
    if (response) return response;
  }
  throw error(404, "Không tìm thấy chức năng marketing.");
}
