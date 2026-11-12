const { defaults } = require("./settings");
const { read, write } = require("./storage");
const { loadState } = require("./history");
const runtime = require("./runtime");

async function main(task, dependencies = {}) {
  const config = {
    ...defaults,
    headless: false,
    groups: [],
    discoveredGroups: [],
    cloudCampaignId: "",
    searchKeywords: task.config.keywords,
    excludedKeywords: task.config.excludedKeywords,
    maxScrolls: 5,
    groupSelection: {
      ...defaults.groupSelection,
      enabled: true,
      mode: "explicit-permission",
      topicKeywords: task.config.keywords,
      maxGroupsPerRun: task.config.limit,
    },
  };
  write("config.json", { ...read("config.json", {}), ...config });
  runtime.startDeadline(30);
  const sync = dependencies.sync || require("./get_groups").main;
  const search = dependencies.search || require("./search_groups").main;
  const inspect = dependencies.inspect || require("./select_groups").main;
  const joined = await sync({ config });
  runtime.checkStop();
  const found = await search({ config });
  runtime.checkStop();
  config.discoveredGroups = [...new Set([...found, ...(joined || [])])].slice(
    0,
    task.config.limit,
  );
  await inspect({ config, force: true });
  const state = loadState();
  // Discovery never imports post_runner, joins groups, reserves or submits posts.
  return config.discoveredGroups.map((url) => {
    const group = state.groups[url] || {};
    return {
      url,
      name: group.name || url,
      membership: group.membership || "unknown",
      source: (joined || []).includes(url) ? "joined" : "search",
      reason:
        group.selection?.reason ||
        "Cần kiểm tra nội quy và quyền đăng trước khi chọn.",
    };
  });
}
module.exports = { main };
