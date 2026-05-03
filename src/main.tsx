import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Yahan basename add karna hai 👇 */}
    <BrowserRouter basename="/hydromet/qpf_Forecast_Verification">
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
