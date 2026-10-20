import { json, maxDaily, id, validPostUrl, publicUser } from "../lib/http.mjs";
import { one, all, run } from "../models/database.mjs";
import {
  body,
  token,
  hash,
  passwordHash,
  equal,
  error,
  rate,
  identity,
  cookieHeader,
} from "../middleware/security.mjs";
export async function authenticate(request, env, action) {
  await rate(
    env,
    `auth:${request.headers.get("CF-Connecting-IP") || "local"}`,
    15,
    900,
  );
  const input = await body(request, 4000);
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const password = String(input.password || "");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    password.length < 12 ||
    password.length > 128
  )
    throw error(400, "Nhập email hợp lệ và mật khẩu 12–128 ký tự.");
  let user;
  if (action === "register") {
    if (env.ALLOW_REGISTRATION !== "true")
      throw error(403, "Đăng ký hiện đang đóng.");
    const salt = token();
    const userId = id();
    const workspaceId = id();
    const name = String(input.name || "")
      .trim()
      .slice(0, 80);
    if (!name) throw error(400, "Nhập tên của bạn.");
    const digest = await passwordHash(password, salt, env.AUTH_SECRET);
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users VALUES (?,?,?,?,?,?)").bind(
          userId,
          email,
          name,
          digest,
          salt,
          Date.now(),
        ),
        env.DB.prepare(
          "INSERT INTO workspaces(id,owner_id,daily_limit) VALUES (?,?,?)",
        ).bind(workspaceId, userId, Math.min(30, maxDaily(env))),
      ]);
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw error(409, "Email này đã được đăng ký.");
      throw e;
    }
    user = { id: userId, email, name };
  } else {
    user = await one(env, "SELECT * FROM users WHERE email=?", email);
    const digest = await passwordHash(
      password,
      user?.salt || "missing-user-salt",
      env.AUTH_SECRET,
    );
    if (!user || !equal(digest, user.password_hash))
      throw error(401, "Email hoặc mật khẩu không đúng.");
  }
  const session = token();
  await run(
    env,
    "INSERT INTO sessions VALUES (?,?,?)",
    await hash(session),
    user.id,
    Date.now() + 604800000,
  );
  return json({ user: publicUser(user) }, 200, {
    "Set-Cookie": cookieHeader(request, session),
  });
}
export async function logout(request, env, path, method, context = {}) {
  const { workspaceId, user } = context;

  const cookie = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("botads_session="))
    ?.slice(15);
  await run(
    env,
    "DELETE FROM sessions WHERE token_hash=?",
    await hash(cookie || ""),
  );
  return json({ ok: true }, 200, {
    "Set-Cookie": cookieHeader(request, "", 0),
  });
}
