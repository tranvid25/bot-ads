import { api } from "../../lib/api";
export default function useCreateNew({
  page,
  setPage,
  setEditor,
  marketingData,
  setMarketingNavigation,
}) {
  const handleCreateNew = async () => {
    if (["facebook", "devices", "campaigns", "results"].includes(page)) {
      setPage("campaigns");
      setEditor("new");
      return;
    }
    setPage("marketing");
    if (!marketingData?.brands?.length) {
      try {
        const res = await api("/marketing/brands", "POST", {
          name: "My organization",
          website: "https://botads.com",
          audience: "General audience",
          language: "vi",
        });
        setMarketingNavigation({
          tab: "content",
          brandId: res.id,
          compose: true,
        });
        return;
      } catch (e) {
        // fallback
      }
    }
    setMarketingNavigation((curr) => ({
      ...curr,
      tab: curr?.tab || "content",
      compose: true,
    }));
  };
  return handleCreateNew;
}
