import { useEffect, useRef } from "react";
import { api } from "../../lib/api";
import { ACTIVE_REFRESH_MS } from "../../../../../packages/contracts/refresh.mjs";
import { googleAuthErrors } from "../../../../../packages/contracts/google-auth.mjs";
export default function useAppEffects({
  meta,
  setMeta,
  data,
  page,
  setPage,
  setNotice,
  setError,
  refresh,
}) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (page === "marketing") url.searchParams.delete("page");
    else url.searchParams.set("page", page);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [page]);
  useEffect(() => {
    api("/meta")
      .then(setMeta)
      .catch((e) => setError(e.message));
    refresh();
  }, []);
  useEffect(() => {
    if (!data) return;
    const url = new URL(window.location.href),
      result = url.searchParams.get("google_auth"),
      avatar = url.searchParams.get("avatar");
    if (avatar) {
      try {
        localStorage.setItem("user_avatar", avatar);
      } catch {}
      url.searchParams.delete("avatar");
    }
    if (result) {
      if (result === "linked") {
        setPage("settings");
        setNotice("Đã liên kết tài khoản Google.");
      } else if (result !== "success") {
        setPage("settings");
        setError(
          Object.hasOwn(googleAuthErrors, result)
            ? googleAuthErrors[result]
            : googleAuthErrors.failed,
        );
      }
      url.searchParams.delete("google_auth");
      window.history.replaceState(
        null,
        "",
        url.pathname + url.search + url.hash,
      );
    }
  }, [!!data]);
  const activeJob = data?.jobs?.some((job) =>
    ["queued", "running"].includes(job.status),
  );
  useEffect(() => {
    if (!data || page === "marketing" || page === "settings") return;
    // Device pairing needs liveness; other pages only poll while work is active.
    if (page !== "devices" && !activeJob) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        refreshRef.current({ dashboardOnly: true });
    }, ACTIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [!!data, page, activeJob]);
}
