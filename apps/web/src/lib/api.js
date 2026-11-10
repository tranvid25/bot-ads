export async function readApiResponse(response) {
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
    if (!result || typeof result !== "object" || Array.isArray(result)) throw 0;
  } catch {
    throw Object.assign(
      new Error(
        `Máy chủ trả phản hồi ${text.trim() ? "không hợp lệ" : "rỗng"} (HTTP ${response.status}). Hãy tải lại hoặc thử lại sau; nếu lỗi tiếp diễn, kiểm tra kết nối Pages–Worker và log backend.`,
      ),
      { status: response.status },
    );
  }
  if (!response.ok)
    throw Object.assign(
      new Error(
        typeof result.error === "string"
          ? result.error
          : "Không thực hiện được yêu cầu.",
      ),
      { status: response.status },
    );
  return result;
}
export async function api(path, method = "GET", data) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  return readApiResponse(response);
}
