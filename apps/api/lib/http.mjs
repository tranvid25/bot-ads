export const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
export const maxDaily = (env) =>
  Math.max(1, Number(env.MAX_DAILY_POSTS) || 100);
export const id = () => crypto.randomUUID();
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

export function validPostUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      ["www.facebook.com", "facebook.com", "m.facebook.com"].includes(
        u.hostname,
      )
      ? u.href
      : null;
  } catch {
    return null;
  }
}
