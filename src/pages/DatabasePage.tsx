import { useState, useEffect } from "react";
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Clock,
  Server,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useForecastStore } from "@/hooks/useForecastStore";
import { useQPFStore } from "@/hooks/useQPFStore";
import KPICard from "@/components/ui/KPICard";
import { Switch } from "@/components/ui/switch";

interface SyncLog {
  id: string;
  timestamp: string;
  status: "success" | "error";
  message: string;
}

export default function DatabasePage() {
  const {
    syncAllToDatabase: syncForecastData,
    currentUser,
    addToast,
  } = useForecastStore();
  const { syncAllToDatabase: syncQPFData } = useQPFStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [autoSync, setAutoSync] = useState(
    () => localStorage.getItem("hydromet_auto_sync") === "true",
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // पुराने सिंक लॉग्स को लोकल स्टोरेज से लोड करें
  useEffect(() => {
    const savedLogs = localStorage.getItem("hydromet_sync_logs");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  // Auto Sync Effect (हर 5 मिनट में)
  useEffect(() => {
    localStorage.setItem("hydromet_auto_sync", autoSync.toString());
    let interval: ReturnType<typeof setInterval>;
    if (autoSync) {
      interval = setInterval(
        () => {
          handleSync();
        },
        5 * 60 * 1000,
      );
    }
    return () => clearInterval(interval);
  }, [autoSync]);

  // डेटाबेस को सिंक करने और लॉग्स सेव करने का फंक्शन
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncForecastData();
      await syncQPFData();

      const newLog: SyncLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: "success",
        message: "All data successfully synced to MongoDB.",
      };
      // केवल पिछले 50 लॉग्स ही सेव रखें ताकि डेटाबेस भारी न हो
      setLogs((prev) => {
        const updated = [newLog, ...prev].slice(0, 50);
        localStorage.setItem("hydromet_sync_logs", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      const newLog: SyncLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        status: "error",
        message: "Failed to sync data to MongoDB. Is Server running?",
      };
      setLogs((prev) => {
        const updated = [newLog, ...prev].slice(0, 50);
        localStorage.setItem("hydromet_sync_logs", JSON.stringify(updated));
        return updated;
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // डेटाबेस क्लियर करने का फंक्शन (Admin Only)
  const handleDeleteDatabase = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("http://localhost:5000/api/clear-data", {
        method: "DELETE",
      });
      if (res.ok) {
        addToast("Cloud Database Cleared Successfully!", "success");
        setLogs([]);
        localStorage.removeItem("hydromet_sync_logs");
      } else {
        addToast("Failed to clear database", "error");
      }
    } catch (error) {
      addToast("Server error while deleting database", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Database Status"
          value="Ready to Sync"
          icon={<Server size={22} />}
          color="#10b981"
        />
        <KPICard
          title="Last Sync Time"
          value={
            logs.length > 0
              ? new Date(logs[0].timestamp).toLocaleTimeString()
              : "Never"
          }
          subtitle={
            logs.length > 0
              ? new Date(logs[0].timestamp).toLocaleDateString()
              : ""
          }
          icon={<Clock size={22} />}
          color="#3b82f6"
        />
        <KPICard
          title="Total Syncs"
          value={logs.length}
          icon={<RefreshCw size={22} />}
          color="#f59e0b"
        />
      </div>

      {/* Sync Button Card */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2">
              <Database className="text-[#3b82f6]" /> Database Synchronization
            </h2>
            <p className="text-sm text-[#94a3b8] mt-1">
              Push all local Forecast, Realised, and QPF data directly to the
              MongoDB backend server.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 bg-[#0d1f35] px-4 py-3 rounded-lg border border-[#1e3a5f]">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#e2e8f0]">
                  Auto Sync
                </span>
                <span className="text-[10px] text-[#64748b]">Every 5 mins</span>
              </div>
              <Switch
                checked={autoSync}
                onCheckedChange={setAutoSync}
                className="data-[state=checked]:bg-[#10b981]"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <RefreshCw
                className={isSyncing ? "animate-spin" : ""}
                size={20}
              />
              {isSyncing ? "Syncing..." : "Manual Sync"}
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone (Admin Only) */}
      {currentUser?.role === "admin" && (
        <div className="bg-[#111d32] border border-[#ef4444]/40 rounded-xl p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#ef4444] flex items-center gap-2">
                <Trash2 className="text-[#ef4444]" /> Danger Zone (Admin Only)
              </h2>
              <p className="text-sm text-[#94a3b8] mt-1">
                Permanently delete all data from the MongoDB Cloud Database.
                This action cannot be undone.
              </p>
            </div>
            <div>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-transparent border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-white rounded-lg transition-colors font-semibold"
                >
                  <Trash2 size={18} /> Wipe Database
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#e2e8f0] flex items-center gap-1">
                    <AlertTriangle size={18} className="text-[#f59e0b]" /> Sure?
                  </span>
                  <button
                    onClick={handleDeleteDatabase}
                    disabled={isDeleting}
                    className="px-5 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg transition-colors font-bold disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete!"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-5 py-2.5 bg-transparent border border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a] rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-md">
        <div className="px-5 py-4 border-b border-[#1e3a5f] bg-[#0d1f35]">
          <h3 className="text-sm font-semibold text-[#e2e8f0]">
            Sync History Logs
          </h3>
        </div>
        <div className="p-0 max-h-[400px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-[#64748b]">
              <Clock size={32} className="mx-auto mb-3 opacity-30" />
              <p>No synchronization logs found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#1e3a5f]">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[#1a2d4a]/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {log.status === "success" ? (
                      <CheckCircle2 className="text-[#10b981]" size={20} />
                    ) : (
                      <Database className="text-[#ef4444]" size={20} />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#e2e8f0]">
                        {log.status === "success"
                          ? "Sync Successful"
                          : "Sync Failed"}
                      </p>
                      <p className="text-xs text-[#94a3b8]">{log.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-[#e2e8f0]">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-[#94a3b8]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
