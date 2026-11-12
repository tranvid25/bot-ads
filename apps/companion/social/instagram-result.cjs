const { permalink } = require("../../../packages/social-contract.cjs");
function resultFromResponse(data, actorId, content) {
  const media = data?.media;
  if (
    !media ||
    data.status !== "ok" ||
    media.user?.username?.toLowerCase() !== actorId ||
    media.caption?.text !== content ||
    !/^[A-Za-z0-9_-]+$/.test(media.code || "")
  )
    return null;
  return permalink("instagram", `https://www.instagram.com/p/${media.code}/`);
}
module.exports = { resultFromResponse };
