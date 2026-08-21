import React from "react";
import { createRoot } from "react-dom/client";
import "../../app/globals.css";
import { ThermometerDashboard } from "../../app/ThermometerDashboard";

import "./preview.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThermometerDashboard />
  </React.StrictMode>,
);
