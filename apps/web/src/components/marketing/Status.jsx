import React from "react";
import { states } from "./constants";

export default function Status({ value, provider }) {
  const isMeta = ["facebook", "instagram", "threads"].includes(provider);
  const label =
    value === "awaiting_manual" && isMeta
      ? "Chờ Desktop Bot"
      : states[value] || value;
  const statusClass =
    value === "awaiting_manual" && isMeta ? "scheduled" : value;
  return (
    <span className={`mk-status mk-${statusClass}`}>
      {label}
    </span>
  );
}

