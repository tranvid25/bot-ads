const { updateFeed } = require("../packages/desktop-update.cjs");
function configureUpdates(config, { platform, arch, lite, enabled = true }) {
  const feed = updateFeed(platform, arch, lite);
  config.extraMetadata.botadsUpdate = enabled ? feed : null;
  config.publish = enabled ? [feed] : null;
  config.generateUpdatesFilesForAllChannels = false;
  return config;
}
module.exports = { configureUpdates };
