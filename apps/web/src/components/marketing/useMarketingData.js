import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
export default function useMarketingData({
  snapshot,
  onSnapshot,
  setBrandId,
  setError,
}) {
  const [data, setData] = useState(snapshot || null);
  const pending = useRef(null),
    loadRef = useRef(null);
  function load() {
    if (pending.current) return pending.current;
    pending.current = api("/marketing")
      .then((next) => {
        setData(next);
        onSnapshot?.(next);
        setBrandId((curr) => curr || next.brands[0]?.id || "");
      })
      .finally(() => {
        pending.current = null;
      });
    return pending.current;
  }
  loadRef.current = load;
  useEffect(() => {
    if (snapshot) setData(snapshot);
  }, [snapshot]);
  const active = data?.publications?.some((p) =>
    ["scheduled", "publishing", "running", "retry_wait", "queued"].includes(
      p.status,
    ),
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        loadRef.current().catch((e) => setError(e.message));
    }, 30000);
    return () => clearInterval(timer);
  }, [active]);
  return { data, load };
}
