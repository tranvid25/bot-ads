import { useState } from "react";
import { api } from "../../lib/api";
const newCampaign = () => ({
  workflowVersion: 2,
  groupIds: [],
  name: "",
  mode: "manual",
  product: "",
  prompt: "",
  posts: [
    {
      id: crypto.randomUUID(),
      title: "Bài đầu tiên",
      content: "",
      assetId: "",
      selected: true,
    },
  ],
  autoGenerate: false,
  keywords: [],
  excludedKeywords: [],
  groupUrls: [],
  autoDiscover: false,
  autoJoin: false,
  policyMode: "exclude-prohibited",
  dailyLimit: 30,
  cooldownDays: 7,
  time: "09:00",
  weekdays: [1, 2, 3, 4, 5],
  timezone: "Asia/Ho_Chi_Minh",
  commentEnabled: false,
  commentUrl: "",
  commentText: "Bạn có thể xem thêm tại đây:",
  enabled: false,
});
export default function useCampaignEditor({ value, onSaved, onClose }) {
  const [form, setForm] = useState(() =>
    structuredClone({
      ...newCampaign(),
      ...value,
      workflowVersion: 2,
      autoDiscover: false,
      autoJoin: false,
    }),
  );
  const [step, setStep] = useState("content"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const postSet = (index, key, val) =>
    setForm((prev) => ({
      ...prev,
      posts: prev.posts.map((p, i) => (i === index ? { ...p, [key]: val } : p)),
    }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(
        form.id ? `/campaigns/${form.id}` : "/campaigns",
        form.id ? "PUT" : "POST",
        form,
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const result = await api("/generate", "POST", { ...form, count: 3 });
      set("posts", [
        ...form.posts.filter((p) => p.content.trim()),
        ...result.posts,
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return {
    form,
    setForm,
    step,
    setStep,
    busy,
    setBusy,
    error,
    setError,
    set,
    postSet,
    save,
    generate,
  };
}
