import React from "react";
import CampaignContentMode from "./CampaignContentMode";
import CampaignPosts from "./CampaignPosts";
import CampaignComments from "./CampaignComments";
export default function CampaignContent(props) {
  return (
    <>
      <CampaignContentMode {...props} />
      <CampaignPosts {...props} />
      <CampaignComments {...props} />
    </>
  );
}
