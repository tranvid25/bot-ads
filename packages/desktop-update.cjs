const UPDATE_URL =
  "https://github.com/tranvid25/bot-ads/releases/latest/download/";
function updateFeed(platform, arch, lite) {
  if (
    !["win32", "darwin"].includes(platform) ||
    !["x64", "arm64"].includes(arch)
  )
    throw new Error("Unsupported desktop update target.");
  return {
    provider: "generic",
    url: UPDATE_URL,
    channel: `stable-${platform}-${arch}-${lite ? "lite" : "full"}`,
    useMultipleRangeRequest: false,
  };
}
module.exports = { UPDATE_URL, updateFeed };
