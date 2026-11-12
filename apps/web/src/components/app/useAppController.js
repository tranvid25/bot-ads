import { api, readApiResponse } from "../../lib/api";
import useAppState from "./useAppState";
import useAppEffects from "./useAppEffects";
import useChannelConnect from "./useChannelConnect";
import useCreateNew from "./useCreateNew";
const nav = [
  ["marketing", "campaign", "Marketing đa kênh"],
  ["facebook", "campaign", "Facebook Groups"],
  ["overview", "grid", "Tổng quan"],
  ["campaigns", "campaign", "Chiến dịch Facebook"],
  ["devices", "device", "Thiết bị"],
  ["results", "history", "Kết quả"],
  ["settings", "settings", "Cài đặt"],
];
export default function useAppController() {
  const state = useAppState();
  const {
    meta,
    setMeta,
    data,
    setData,
    loading,
    setLoading,
    page,
    setPage,
    editor,
    setEditor,
    notice,
    setNotice,
    error,
    setError,
    pair,
    setPair,
    events,
    setEvents,
    busy,
    setBusy,
    limit,
    setLimit,
    showQuotaCard,
    setShowQuotaCard,
    showConnectChannelModal,
    setShowConnectChannelModal,
    marketingData,
    setMarketingData,
    marketingNavigation,
    setMarketingNavigation,
    campaignSeed,
    setCampaignSeed,
  } = state;
  const refresh = async () => {
    try {
      const [d, m] = await Promise.all([
        api("/dashboard"),
        api("/marketing").catch(() => null),
      ]);
      setData(d);
      if (m) setMarketingData(m);
      setLimit(d.settings.dailyLimit);
      return d;
    } catch (e) {
      if (e.status === 401) setData(null);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  async function action(work, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh();
      if (message) setNotice(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh tối đa 5 MB.");
    const r = await fetch("/api/assets", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    });
    const result = await readApiResponse(r);
    await refresh();
    return result;
  }
  const shared = {
    ...state,
    refresh,
    action,
    upload,
  };
  useAppEffects(shared);
  return {
    ...shared,
    handleConnectNewChannel: useChannelConnect(shared),
    handleCreateNew: useCreateNew(shared),
    device: data?.devices[0],
    online:
      !!data?.devices[0] && Date.now() - data.devices[0].last_seen < 120000,
    selectedCampaign:
      data?.campaigns.find((c) => c.id === editor) || campaignSeed,
    title: nav.find((n) => n[0] === page)?.[2] || "BotAds",
  };
}
