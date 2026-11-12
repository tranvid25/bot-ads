import { api } from "../../lib/api";
export default function useChannelConnect({
  data,
  setNotice,
  setError,
  setBusy,
  marketingData,
  setMarketingData,
}) {
  const handleConnectNewChannel = async ({ provider, name, apiKey, brandId: chosenBrand }) => {
    setBusy(true);
    setError("");
    try {
      let brandId = chosenBrand || marketingData?.brands?.[0]?.id;
      if (!brandId) {
        try {
          const m = await api("/marketing");
          setMarketingData(m);
          brandId = m.brands?.[0]?.id;
        } catch {}
      }
      if (!brandId) {
        const bRes = await api("/marketing/brands", "POST", {
          name: data?.user?.name
            ? `${data.user.name}'s Brand`
            : "My Organization",
          website: "https://bot.salesora.space",
          audience: "All",
          language: "vi",
          ctaUrl: "https://bot.salesora.space",
        });
        brandId = bRes.id;
      }
      if (provider === "linkedin" || (provider === "bluesky" && !apiKey)) {
        const res = await api(`/marketing/${provider}/start`, "POST", {
          brandId,
        });
        window.location.assign(res.url);
        return;
      }
      if (provider === "dev") {
        await api("/marketing/channels/dev", "POST", {
          brandId,
          apiKey,
        });
      } else if (["threads", "instagram"].includes(provider)) {
        await api("/marketing/desktop/start", "POST", { brandId, provider });
        setNotice(`Đã gửi yêu cầu ${provider}. Mở app BotAds trên máy và tự đăng nhập ở cửa sổ trình duyệt. Chưa kết nối cho đến khi xác minh tài khoản.`);
        return;
      } else if (provider === "bluesky") {
        await api("/marketing/channels/bluesky", "POST", {
          brandId,
          handle: name,
          appPassword: apiKey,
        });
      } else {
        await api("/marketing/channels/manual", "POST", {
          brandId,
          provider,
          name,
        });
      }
      const mRes = await api("/marketing");
      setMarketingData(mRes);
      setNotice(`Đã kết nối kênh ${name} thành công.`);
    } catch (err) {
      setError(err.message || "Không thể kết nối kênh.");
    } finally {
      setBusy(false);
    }
  };
  return handleConnectNewChannel;
}
