export class PublishError extends Error {
  constructor(message, state = "failed", retryAfter = 0) {
    super(message);
    this.state = state;
    this.retryAfter = retryAfter;
  }
}
export async function providerFetch(env, url, init = {}) {
  const options = {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  };
  // Workers' global fetch requires its original receiver. Placing it on an
  // arbitrary object throws Illegal invocation before any HTTP request is sent.
  if (env.PROVIDER_HTTP) return env.PROVIDER_HTTP.fetch(url, options);
  return fetch(url, options);
}
export async function requireSuccess(response, submitted = false) {
  if (response.ok) return response;
  if (response.status === 401)
    throw new PublishError(
      "Kết nối đã hết hiệu lực. Hãy kết nối lại tài khoản.",
      "needs_reauth",
    );
  if (response.status === 403)
    throw new PublishError(
      "Nền tảng từ chối quyền đăng. Kiểm tra quyền ứng dụng và tài khoản.",
    );
  if (response.status === 429) {
    const raw = response.headers.get("retry-after");
    const seconds = Number(raw);
    const delay =
      Number.isFinite(seconds) && seconds > 0
        ? seconds * 1000
        : Date.parse(raw) - Date.now();
    throw new PublishError(
      "Đã đạt giới hạn nền tảng. Hệ thống sẽ thử lại sau.",
      "retry_wait",
      Math.max(60000, Math.min(delay || 300000, 86400000)),
    );
  }
  throw new PublishError(
    `Nền tảng trả HTTP ${response.status}. ${submitted && response.status >= 500 ? "Chưa rõ kết quả; cần kiểm tra trước khi gửi lại." : "Kiểm tra nội dung và cấu hình kết nối."}`,
    submitted && response.status >= 500 ? "unknown" : "failed",
  );
}
