if (
  typeof window !== "undefined" &&
  window.location.hostname === "localhost"
) {
  window.location.replace(
    window.location.href.replace("//localhost:", "//127.0.0.1:"),
  );
}

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import "./publishing.css";
createRoot(document.getElementById("root")).render(<App />);
