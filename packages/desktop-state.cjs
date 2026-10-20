function mergeReservations(state, reservations) {
  const known = new Set(state.attempts.map((a) => a.id));
  const extras = reservations
    .filter((a) => !known.has(a.id))
    .map((a) => ({
      ...a,
      status: a.status === "failed" ? "failed" : "unknown",
    }));
  return {
    ...state,
    version: state.version || 2,
    groups: state.groups || {},
    runs: state.runs || [],
    attempts: [...state.attempts, ...extras],
  };
}
function campaignConfig(
  campaign,
  workspace,
  job,
  assets,
  defaults,
  previous = {},
) {
  return {
    ...defaults,
    headless: false,
    groups: campaign.groupUrls,
    discoveredGroups:
      previous.cloudCampaignId === job.campaignId
        ? previous.discoveredGroups || []
        : [],
    cloudJobId: job.id,
    cloudCampaignId: job.campaignId,
    contentMode: campaign.mode,
    selectedPosts: campaign.posts
      .filter((p) => p.selected && p.content)
      .map((p) => ({ ...p, imagePath: p.assetId ? assets[p.assetId] : null })),
    maxPostsPerDay: Math.min(workspace.daily_limit, campaign.dailyLimit),
    maxPostsPerRun: campaign.dailyLimit,
    maxRunMinutes: 180,
    timezone: workspace.timezone,
    cooldownDays: campaign.cooldownDays,
    searchKeywords: campaign.keywords,
    excludedKeywords: campaign.excludedKeywords,
    groupSelection: {
      enabled: true,
      mode: campaign.policyMode,
      maxGroupsPerRun: Math.max(30, campaign.dailyLimit),
      recheckDays: 7,
      topicKeywords: campaign.keywords,
    },
    automation: {
      search: campaign.autoDiscover,
      sync: true,
      join: campaign.autoJoin,
      generateAI: false,
    },
    commentLinkUnderPost: campaign.commentEnabled,
    commentWebsiteUrl: campaign.commentUrl || "https://example.com",
    commentContent: campaign.commentText,
    attachImage: false,
    images: [],
  };
}
module.exports = { mergeReservations, campaignConfig };
