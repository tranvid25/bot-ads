import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
export default function useCampaignReport(campaignId, jobId = "") {
  const [report, setReport] = useState(null),
    [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    job: jobId,
    q: "",
    page: 1,
  });
  const [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const active = useRef(false);
  const reload = () => setRevision((n) => n + 1);
  useEffect(() => {
    const current = ++sequence.current;
    let disposed = false,
      pending = false;
    async function load() {
      if (pending || document.hidden) return;
      pending = true;
      setLoading(true);
      try {
        const result = await api(
          `/campaigns/${campaignId}/results?${new URLSearchParams(filters)}`,
        );
        if (!disposed && current === sequence.current) {
          setReport(result);
          setError("");
        }
      } catch (e) {
        if (!disposed) setError(e.message);
      } finally {
        pending = false;
        if (!disposed) setLoading(false);
      }
    }
    load();
    const timer = setInterval(() => {
      // Refresh only while this campaign has active work or pending verification.
      if (active.current) load();
    }, 30000);
    const visible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [campaignId, filters, revision]);
  active.current =
    !!report &&
    (report.jobs.some((j) => ["queued", "running"].includes(j.status)) ||
      report.attempts.some((a) =>
        ["queued", "running"].includes(a.recheck_status),
      ));
  return { report, error, loading, filters, setFilters, reload };
}
