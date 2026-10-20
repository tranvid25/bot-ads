export const one = (env, sql, ...args) =>
  env.DB.prepare(sql)
    .bind(...args)
    .first();
export const all = async (env, sql, ...args) =>
  (
    await env.DB.prepare(sql)
      .bind(...args)
      .all()
  ).results;
export const run = (env, sql, ...args) =>
  env.DB.prepare(sql)
    .bind(...args)
    .run();
