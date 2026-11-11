import React, { useState } from "react";
import Dialog from "./Dialog";

export default function MetricsModal({ metrics, setMetrics, onSave, busy }) {
  if (!metrics) return null;

  return (
    <Dialog title="Số liệu do bạn cung cấp" onClose={() => setMetrics(null)}>
      <form
        className="mk-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(metrics);
        }}
      >
        <p>
          Nhập số liệu từ công cụ analytics/CRM của bạn. BotAds không tự suy ra
          hiệu quả SEO hoặc lượt trích dẫn AI.
        </p>
        <label>
          Lượt về website
          <input
            required
            type="number"
            min={0}
            max={100000000}
            value={metrics.visits}
            onChange={(e) =>
              setMetrics({ ...metrics, visits: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Lead nhận được
          <input
            required
            type="number"
            min={0}
            max={100000000}
            value={metrics.leads}
            onChange={(e) =>
              setMetrics({ ...metrics, leads: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Nguồn dữ liệu / kỳ đo
          <textarea
            maxLength={2000}
            rows={3}
            value={metrics.note}
            onChange={(e) => setMetrics({ ...metrics, note: e.target.value })}
          />
        </label>
        <button className="primary" disabled={busy}>
          Lưu số liệu
        </button>
      </form>
    </Dialog>
  );
}

