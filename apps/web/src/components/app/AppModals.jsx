import React from "react";
import Editor from "../CampaignEditor";
import ConnectChannelModal from "../marketing/ConnectChannelModal";
import { useApp } from "./AppContext";
export default function AppModals() {
  const {
    meta,
    data,
    editor,
    setEditor,
    error,
    busy,
    showConnectChannelModal,
    setShowConnectChannelModal,
    marketingData,
    setCampaignSeed,
    refresh,
    upload,
    handleConnectNewChannel,
    selectedCampaign,
  } = useApp();
  return (
    <>
      {editor && (
        <Editor
          key={editor}
          value={selectedCampaign}
          assets={data.assets}
          meta={meta}
          onClose={() => {
            setEditor(null);
            setCampaignSeed(null);
          }}
          onSaved={refresh}
          onUpload={upload}
        />
      )}
      <ConnectChannelModal
        isOpen={showConnectChannelModal}
        onClose={() => setShowConnectChannelModal(false)}
        channels={marketingData?.channels || []}
        brands={marketingData?.brands || []}
        onConnectChannel={handleConnectNewChannel}
        busy={busy}
        error={error}
      />
    </>
  );
}
