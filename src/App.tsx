import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/ui/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ForecastEntryPage from "@/pages/ForecastEntry";
import RealisedEntryPage from "@/pages/RealisedEntry";
import VerificationReportPage from "@/pages/VerificationReport";
import AnalyticsChartsPage from "@/pages/AnalyticsCharts";
import ContingencyAnalysisPage from "@/pages/ContingencyAnalysis";
import SettingsPage from "@/pages/SettingsPage";
import LoginPage from "@/pages/LoginPage";
import { ForecastProvider } from "@/hooks/useForecastStore";
import { QPFProvider } from "@/hooks/useQPFStore";
import QPFForecastEntryPage from "@/pages/QPFForecastEntry";
import QPFRealisedEntryPage from "@/pages/QPFRealisedEntry";
import QPFVerificationReport from "@/pages/QPFVerificationReport";
import QPFAnalyticsCharts from "@/pages/QPFAnalyticsCharts";
import QPFUploadDataPage from "@/pages/QPFUploadData";
import QPFContingency from "@/pages/QPFContingency";
import "./App.css";

function App() {
  return (
    <ForecastProvider>
      <QPFProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route
                    path="/swfc/Rainfall_Forecast_Verification/forecast"
                    element={<ForecastEntryPage />}
                  />
                  <Route
                    path="/swfc/Rainfall_Forecast_Verification/realised"
                    element={<RealisedEntryPage />}
                  />
                  <Route
                    path="/swfc/QPF_Forecast_Entry"
                    element={<QPFForecastEntryPage />}
                  />
                  <Route
                    path="/swfc/QPF_Realised_Entry"
                    element={<QPFRealisedEntryPage />}
                  />
                  <Route
                    path="/swfc/QPF_Upload_Data"
                    element={<QPFUploadDataPage />}
                  />
                  <Route
                    path="/swfc/QPF_Verification_Report"
                    element={<QPFVerificationReport />}
                  />
                  <Route
                    path="/swfc/QPF_Analytics_Charts"
                    element={<QPFAnalyticsCharts />}
                  />
                  <Route
                    path="/swfc/QPF_Contingency"
                    element={<QPFContingency />}
                  />
                  <Route
                    path="/verification"
                    element={<VerificationReportPage />}
                  />
                  <Route path="/charts" element={<AnalyticsChartsPage />} />
                  <Route
                    path="/contingency"
                    element={<ContingencyAnalysisPage />}
                  />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </QPFProvider>
    </ForecastProvider>
  );
}

export default App;
