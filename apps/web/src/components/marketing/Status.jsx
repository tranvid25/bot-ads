import React from "react";
import { states } from "./constants";

export default function Status({ value, provider }) {
  const label = states[value] || value;
  const statusClass = value;
  return (
    <span className={`mk-status mk-${statusClass}`}>
      {label}
    </span>
  );
}

