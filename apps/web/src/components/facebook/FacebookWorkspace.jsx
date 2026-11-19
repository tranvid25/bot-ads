import React from "react";
import useFacebookGroups from "./useFacebookGroups";
import FacebookGuide from "./FacebookGuide";
import DiscoveryForm from "./DiscoveryForm";
import GroupLibrary from "./GroupLibrary";
import GroupTasks from './GroupTasks';
import "./facebook.css";

export default function FacebookWorkspace({
  device,
  campaigns,
  onDevices,
  onCompose,
  onResults,
}) {
  const { groups, tasks, error, notice, setNotice, busy, act } =
    useFacebookGroups();
  return (
    <div className="fb-workspace">
      {notice && (
        <div className="alert success fb-toast" role="status">
          {notice}
          <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
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
      <GroupTasks tasks={tasks} busy={busy} act={act} />
      <GroupLibrary
        groups={groups}
        busy={busy}
        act={act}
        onCompose={onCompose}
      />
    </div>
  );
}
