import { useEffect, useState, useRef } from "react";
import { api } from "../../lib/api";

export default function useFacebookGroups() {
  const [data, setData] = useState({ groups: [], tasks: [] });
  const tasksRef = useRef(null),
    pending = useRef(false),
    refreshQueued = useRef(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    if (document.visibilityState !== "visible") return;
    if (pending.current) { refreshQueued.current = true; return; }
    pending.current = true;
    try {
      const next = await api("/facebook");
      if (tasksRef.current) {
        for (const task of next.tasks) {
          if (
            task.status === "completed" &&
            tasksRef.current.get(task.id) !== "completed"
          )
            setNotice(
              task.kind === 'membership'
                ? `Đã xử lý ${task.groups_seen} nhóm. Xem chi tiết: đã tham gia, chờ duyệt hoặc cần bạn hoàn tất.`
                : `Đã hoàn tất lượt tìm: ${task.groups_seen} nhóm được ghi nhận. Mở thư viện để kiểm tra và duyệt.`,
            );
        }
      }
      tasksRef.current = new Map(
        next.tasks.map((task) => [task.id, task.status]),
      );
      setData(next);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      pending.current = false;
      if (refreshQueued.current) { refreshQueued.current = false; void load(); }
    }
  }
  useEffect(() => {
    load();
    document.addEventListener('visibilitychange', load);
    return () => document.removeEventListener('visibilitychange', load);
  }, []);
  const active = data.tasks.some((task) =>
    ["queued", "running"].includes(task.status),
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [active]);
  async function act(path, method, input) {
    setBusy(true);
    setError("");
    try {
      const result = await api(`/facebook/${path}`, method, input);
      if (path === 'groups/membership') setNotice(`Đã xếp lượt xử lý ${result.count} nhóm. Máy BotAds từ bản 1.1.14 sẽ nhận khi online và sẵn sàng; xem Tiến độ tìm và tham gia nhóm.`);
      if (path === "groups/import") setNotice(`Đã thêm ${result.added} nhóm; ${result.duplicate} nhóm đã có.`);
      if (path === "groups/review")
        setNotice(
          `Đã duyệt ${result.approved} nhóm; ${result.skipped} nhóm cần kiểm tra riêng.`,
        );
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { ...data, error, notice, setNotice, busy, act, reload: load };
}
