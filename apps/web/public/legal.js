const form = document.querySelector("[data-support-form]");
if (form) {
  const category = new URLSearchParams(window.location.search).get("topic");
  if (["support", "privacy", "deletion"].includes(category))
    form.elements.category.value = category;
  const initialCategory = form.elements.category.value;
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-form-status]");
  button.disabled = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    button.disabled = true;
    status.textContent = "Đang gửi / Sending…";
    status.classList.remove("error", "success");
    try {
      const fields = new FormData(form);
      const response = await fetch("/api/support/requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          email: fields.get("email"),
          category: fields.get("category"),
          message: fields.get("message"),
          acknowledged: fields.get("acknowledged") === "on",
        }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Không gửi được yêu cầu / Request failed.",
        );
      form.reset();
      form.elements.category.value = initialCategory;
      status.classList.add("success");
      status.textContent = `Đã tiếp nhận / Request received. Mã / Reference: ${result.id}. Giữ mã này để đối chiếu. Yêu cầu xóa cần được xác minh; dữ liệu chưa tự động bị xóa. / Keep this reference. Deletion requests require verification and do not automatically erase data.`;
    } catch (error) {
      status.classList.add("error");
      status.textContent =
        error.name === "TimeoutError"
          ? "Chưa nhận được phản hồi. Vui lòng kiểm tra kết nối; gửi lại có thể tạo yêu cầu thứ hai. / No response received; retrying may create a second request."
          : error.message;
    } finally {
      button.disabled = false;
    }
  });
}
