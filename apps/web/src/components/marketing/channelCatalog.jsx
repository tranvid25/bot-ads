import React from "react";

export const CHANNEL_CATALOG = [
  {
    key: "bluesky",
    name: "Bluesky",
    desc: "Tự động 100% · OAuth 1 chạm",
    authType: "oauth",
    bg: "#0285ff",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
        <path d="M12 10.8c-1.08-2.08-3.08-5.3-5.5-6.8C3.8 2.2 2 3.1 2 5.5c0 1.2.6 6.3 1 7.4 1.4 3.7 4.5 4.6 7 4.1-3.6 1.8-6.9 4.3-3.6 8 3.8 4.3 5.6-2.5 5.6-2.5s1.8 6.8 5.6 2.5c3.3-3.7 0-6.2-3.6-8 2.5.5 5.6-.4 7-4.1.4-1.1 1-6.2 1-7.4 0-2.4-1.8-3.3-4.5-1.5-2.42 1.5-4.42 4.72-5.5 6.8z"/>
      </svg>
    ),
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    desc: "Tự động 100% · OAuth 1 chạm",
    authType: "oauth",
    bg: "#0a66c2",
    icon: <span style={{ color: "#fff", fontWeight: 800, fontSize: "18px" }}>in</span>,
  },
  {
    key: "dev",
    name: "DEV Community",
    desc: "Tự động 100% · API Key",
    authType: "apikey",
    bg: "#090909",
    icon: <span style={{ color: "#fff", fontWeight: 800, fontSize: "13px" }}>DEV</span>,
  },
  {
    key: "facebook",
    name: "Facebook",
    desc: "Tự động qua Desktop Bot",
    isMeta: true,
    bg: "#1877f2",
    icon: <span style={{ color: "#fff", fontWeight: 800, fontSize: "22px", fontFamily: "sans-serif" }}>f</span>,
  },
  {
    key: "instagram",
    name: "Instagram",
    desc: "Tự động qua Desktop Bot",
    isMeta: true,
    bg: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
  },
  {
    key: "threads",
    name: "Threads",
    desc: "Tự động qua Desktop Bot",
    isMeta: true,
    bg: "#101010",
    icon: <span style={{ color: "#fff", fontWeight: 700, fontSize: "20px" }}>@</span>,
  },
  {
    key: "substack",
    name: "Substack",
    desc: "Profile",
    bg: "#ff6719",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/>
      </svg>
    ),
  },
  {
    key: "youtube",
    name: "YouTube",
    desc: "Channel",
    bg: "#ff0000",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
        <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 22c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73z"/>
      </svg>
    ),
  },
  {
    key: "tiktok",
    name: "TikTok",
    desc: "Business or Personal",
    bg: "#000000",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.87-4.49V8.69a8.18 8.18 0 0 0 3.9 1V6.69z"/>
      </svg>
    ),
  },
  {
    key: "mastodon",
    name: "Mastodon",
    desc: "Profile",
    bg: "#6364ff",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
        <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.245 15.12.062 12 .062c-3.12 0-5.51.183-5.964.247C3.35.703 1.082 2.735.732 5.313.385 7.87.195 10.98.195 14.072c0 3.09.19 6.202.537 8.76.35 2.578 2.618 4.61 5.304 5.004.455.064 2.845.247 5.964.247 3.12 0 5.51-.183 5.964-.247 2.686-.394 4.954-2.426 5.304-5.004.347-2.558.537-5.67.537-8.76 0-3.092-.19-6.202-.537-8.76zM17.65 14.88h-2.18v-5.26c0-1.22-.5-1.84-1.5-1.84s-1.5.62-1.5 1.84v2.96h-1.04v-2.96c0-1.22-.5-1.84-1.5-1.84s-1.5.62-1.5 1.84v5.26H6.25V9.44c0-1.63.42-2.93 1.25-3.89.84-.96 1.95-1.44 3.32-1.44 1.58 0 2.78.61 3.59 1.83.82-1.22 2.02-1.83 3.6-1.83 1.37 0 2.48.48 3.31 1.44.84.96 1.26 2.26 1.26 3.89v5.44z"/>
      </svg>
    ),
  },
  {
    key: "dev",
    name: "DEV Community",
    desc: "Articles & API",
    authType: "apikey",
    bg: "#090909",
    icon: <span style={{ color: "#fff", fontWeight: 800, fontSize: "13px" }}>DEV</span>,
  },
  {
    key: "medium",
    name: "Medium",
    desc: "Stories & Publications",
    bg: "#000000",
    icon: <span style={{ color: "#fff", fontWeight: 800, fontSize: "17px", fontFamily: "serif" }}>M</span>,
  },
];

