import React from "react";
import CampaignContentMode from "./CampaignContentMode";
import CampaignPosts from "./CampaignPosts";
import CampaignComments from "./CampaignComments";
import TrackingLink from "./TrackingLink";
import ContentLibrary from "./ContentLibrary";
export default function CampaignContent(props) {
  return (
    <>
      <CampaignContentMode {...props} />
      <CampaignPosts {...props} />
      <ContentLibrary form={props.form} set={props.set} />
      <CampaignComments {...props} />
      <TrackingLink form={props.form} />
    </>
  );
}
