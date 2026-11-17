function canonicalPostUrl(value, base = 'https://www.facebook.com') {
  try {
    const url = new URL(value, base);
    if (!['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(url.hostname)) return null;
    const group = url.pathname.match(/^\/groups\/([^/]+)\/(?:posts|permalink)\/([^/]+)/);
    if (group) return `https://www.facebook.com/groups/${group[1]}/posts/${group[2]}/`;
    if (['/permalink.php', '/story.php'].includes(url.pathname) && url.searchParams.get('story_fbid') && url.searchParams.get('id'))
      return `https://www.facebook.com/permalink.php?story_fbid=${url.searchParams.get('story_fbid')}&id=${url.searchParams.get('id')}`;
    return null;
  } catch { return null; }
}
module.exports = { canonicalPostUrl };
