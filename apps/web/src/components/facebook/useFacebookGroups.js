import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function useFacebookGroups() {
  const [data, setData] = useState({ groups: [], tasks: [] });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      setData(await api("/facebook"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);
  async function act(path, method, input) {
    setBusy(true);
    setError("");
    try {
      await api(`/facebook/${path}`, method, input);
      await load();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { ...data, error, busy, act, reload: load };
}
