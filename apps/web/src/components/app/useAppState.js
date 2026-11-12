import { useState } from "react";
export default function useAppState() {
  const [meta, setMeta] = useState({
      maxDaily: 100,
      registrationOpen: true,
    }),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [page, setPage] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("page");
      if (
        [
          "facebook",
          "devices",
          "campaigns",
          "settings",
          "results",
          "overview",
        ].includes(requested)
      )
        return requested;
      return params.get("google_auth") === "linked" ? "settings" : "marketing";
    }),
    [editor, setEditor] = useState(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [pair, setPair] = useState(""),
    [events, setEvents] = useState(null),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(30),
    [showQuotaCard, setShowQuotaCard] = useState(true),
    [showConnectChannelModal, setShowConnectChannelModal] = useState(false),
    [marketingData, setMarketingData] = useState(null),
    [marketingNavigation, setMarketingNavigation] = useState(null);
  const [campaignSeed, setCampaignSeed] = useState(null);
  return {
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
  };
}
