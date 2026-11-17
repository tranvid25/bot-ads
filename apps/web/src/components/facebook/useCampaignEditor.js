import { useState, useRef } from "react";
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
  const requestId = useRef(crypto.randomUUID());
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
    if (
      form.publishMode === "now" &&
      !confirm(
        `Đăng chiến dịch “${form.name}” ngay?\n${form.groupIds.length} nhóm · ${form.posts.filter((p) => p.selected && p.content).length} bài · tối đa ${form.dailyLimit} lượt/ngày.\n${form.groupUrls.slice(0, 10).join("\n")}\nMáy phải online; bài có thể chờ quản trị viên duyệt.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const saved = await api(
        form.id ? `/campaigns/${form.id}` : "/campaigns",
        form.id ? "PUT" : "POST",
        {
          ...form,
          enabled: form.publishMode === "now" ? false : form.enabled,
          requestId: requestId.current,
        },
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
