import { useEffect } from "react";
import { api } from "../../lib/api";
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
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [!!data]);
}
