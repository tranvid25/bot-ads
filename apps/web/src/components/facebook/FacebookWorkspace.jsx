import React from "react";
import useFacebookGroups from "./useFacebookGroups";
import FacebookGuide from "./FacebookGuide";
import DiscoveryForm from "./DiscoveryForm";
import GroupLibrary from "./GroupLibrary";
import "./facebook.css";

const taskStates = {
  queued: "Chờ máy nhận việc",
  running: "Đang tìm và đánh giá",
  completed: "Đã tìm xong",
  failed: "Cần thử lại",
  canceled: "Đã hủy",
};
export default function FacebookWorkspace({
  device,
  campaigns,
  onDevices,
  onCompose,
  onResults,
}) {
  const { groups, tasks, error, busy, act } = useFacebookGroups();
  return (
    <div className="fb-workspace">
      <FacebookGuide
        device={device}
        groupCount={
          groups.filter(
            (g) =>
              g.eligibility === "approved" &&
              g.reviewed_at > Date.now() - 7 * 86400000,
          ).length
        }
        campaignCount={campaigns.length}
        onDevices={onDevices}
        onGroups={() =>
          document.getElementById("fb-discovery")?.scrollIntoView()
        }
        onCompose={() => onCompose([])}
        onResults={onResults}
      />
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div id="fb-discovery">
        <DiscoveryForm
          device={device}
          busy={busy}
          onDevices={onDevices}
          onSubmit={(config) => act("discover", "POST", config)}
        />
      </div>
      {!!tasks.length && (
        <section className="panel mk-form">
          <h2>Tiến độ tìm nhóm</h2>
          {tasks.map((task) => (
            <article key={task.id}>
              <strong>{taskStates[task.status]}</strong>
              <p>
                {task.config.keywords.join(", ")} · {task.groups_seen} kết quả
              </p>
              {task.error && <p className="danger">{task.error}</p>}
              {["queued", "running"].includes(task.status) && (
                <button
                  className="link"
                  disabled={busy}
                  onClick={() => act(`tasks/${task.id}`, "POST", {})}
                >
                  Hủy lượt tìm
                </button>
              )}
            </article>
          ))}
        </section>
      )}
      <GroupLibrary
        groups={groups}
        busy={busy}
        act={act}
        onCompose={onCompose}
      />
    </div>
  );
}
