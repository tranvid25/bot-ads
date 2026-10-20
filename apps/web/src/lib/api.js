export async function api(path, method = "GET", data) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(result.error || "Không thực hiện được yêu cầu."),
      { status: response.status },
    );
  return result;
}
