import { api } from "../../lib/api";
export default async function channelSubmit({
  connection,
  brandId,
  setConnection,
  setNotice,
}) {
  if (["threads", "instagram"].includes(connection.provider)) {
    await api("/marketing/desktop/start", "POST", {
      brandId,
      provider: connection.provider,
    });
    setNotice(
      "Đã gửi yêu cầu. Mở app BotAds để đăng nhập; kênh chỉ kết nối sau khi xác minh tài khoản.",
    );
  } else if (
    connection.provider === "linkedin" ||
    (connection.provider === "bluesky" && !connection.apiKey)
  ) {
    const result = await api(
      `/marketing/${connection.provider}/start`,
      "POST",
      { brandId },
    );
    window.location.assign(result.url);
  } else if (connection.provider === "bluesky") {
    await api("/marketing/channels/bluesky", "POST", {
      brandId,
      handle: connection.name,
      appPassword: connection.apiKey,
    });
  } else {
    await api(
      `/marketing/channels/${connection.provider === "dev" ? "dev" : "manual"}`,
      "POST",
      { brandId, ...connection },
    );
  }
  setConnection({ ...connection, apiKey: "", name: "" });
}
