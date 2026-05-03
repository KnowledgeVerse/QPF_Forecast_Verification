import { useState, useRef } from "react";
import {
  Settings,
  Download,
  Upload,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  Globe,
  Calendar,
  Scale,
  AlertTriangle,
  Key,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForecastStore } from "@/hooks/useForecastStore";
import { generateId } from "@/lib/utils";
import type { AppUser } from "@/types";
import Footer from "@/components/Footer";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    users,
    exportData,
    importData,
    clearAllData,
    addToast,
    currentUser,
  } = useForecastStore();

  const [importText, setImportText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "operator">(
    "operator",
  );
  const [localUsers, setLocalUsers] = useState<AppUser[]>(users);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPassword, setEditingPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raincheck-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Data exported successfully", "success");
  };

  const handleImport = () => {
    if (!importText.trim()) {
      addToast("Paste JSON data to import", "error");
      return;
    }
    const success = importData(importText);
    if (success) {
      addToast("Data imported successfully", "success");
      setImportText("");
    } else {
      addToast("Invalid JSON data", "error");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importData(content);
      if (success) {
        addToast("Data imported successfully from file", "success");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        addToast("Invalid JSON file", "error");
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    clearAllData();
    setShowClearConfirm(false);
    addToast("All data cleared", "info");
  };

  const addUser = () => {
    if (!newUserName.trim() || !newUserPassword.trim()) {
      addToast("Enter name and password", "error");
      return;
    }
    const newUser: AppUser = {
      id: generateId(),
      name: newUserName.trim(),
      role: newUserRole,
      password: newUserPassword,
    };
    const updated = [...localUsers, newUser];
    setLocalUsers(updated);
    localStorage.setItem("rfad_users", JSON.stringify(updated));
    setNewUserName("");
    setNewUserPassword("");
    addToast("User added", "success");
  };

  const removeUser = (id: string) => {
    const updated = localUsers.filter((u) => u.id !== id);
    setLocalUsers(updated);
    localStorage.setItem("rfad_users", JSON.stringify(updated));
    addToast("User removed", "info");
  };

  const savePassword = (id: string) => {
    if (!editingPassword.trim()) {
      addToast("Password cannot be empty", "error");
      return;
    }
    const updated = localUsers.map((u) =>
      u.id === id ? { ...u, password: editingPassword.trim() } : u,
    );
    setLocalUsers(updated);
    localStorage.setItem("rfad_users", JSON.stringify(updated));
    setEditingUserId(null);
    addToast("Password updated successfully", "success");
  };

  const updateWeight = (step: number, value: number) => {
    const weights = { ...settings.matchingWeights, [step]: value };
    updateSettings({ matchingWeights: weights });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* General Settings */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} className="text-[#3b82f6]" />
          <h3 className="text-base font-semibold text-[#e2e8f0]">
            General Settings
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-[#1e3a5f]">
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-[#94a3b8]" />
              <div>
                <p className="text-sm text-[#e2e8f0]">Language</p>
                <p className="text-xs text-[#64748b]">Interface language</p>
              </div>
            </div>
            <select
              value={settings.language}
              onChange={(e) =>
                updateSettings({ language: e.target.value as "en" | "hi" })
              }
              className="bg-[#0d1f35] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded-lg px-3 py-1.5"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#1e3a5f]">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-[#94a3b8]" />
              <div>
                <p className="text-sm text-[#e2e8f0]">Date Format</p>
                <p className="text-xs text-[#64748b]">
                  Display format for dates
                </p>
              </div>
            </div>
            <select
              value={settings.dateFormat}
              onChange={(e) =>
                updateSettings({
                  dateFormat: e.target.value as "DD/MM/YYYY" | "YYYY-MM-DD",
                })
              }
              className="bg-[#0d1f35] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded-lg px-3 py-1.5"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#1e3a5f]">
            <div className="flex items-center gap-3">
              <Settings size={16} className="text-[#94a3b8]" />
              <div>
                <p className="text-sm text-[#e2e8f0]">Auto-Verify</p>
                <p className="text-xs text-[#64748b]">
                  Run verification when realised data is saved
                </p>
              </div>
            </div>
            <Switch
              checked={settings.autoVerify}
              onCheckedChange={(v) => updateSettings({ autoVerify: v })}
              className="data-[state=checked]:bg-[#10b981]"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Settings size={16} className="text-[#94a3b8]" />
              <div>
                <p className="text-sm text-[#e2e8f0]">Auto-Backup</p>
                <p className="text-xs text-[#64748b]">
                  Automatically backup data every 5 minutes
                </p>
              </div>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={(v) => updateSettings({ autoBackup: v })}
              className="data-[state=checked]:bg-[#10b981]"
            />
          </div>
        </div>
      </div>

      {/* Verification Weights */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={18} className="text-[#f59e0b]" />
          <h3 className="text-base font-semibold text-[#e2e8f0]">
            Verification Weights
          </h3>
        </div>
        <p className="text-xs text-[#64748b] mb-4">
          Configure accuracy percentage for each category step difference.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className="bg-[#0d1f35] rounded-lg p-3 border border-[#1e3a5f]"
            >
              <label className="block text-xs text-[#94a3b8] mb-1">
                {step === 0
                  ? "Exact Match"
                  : `${step} Step${step > 1 ? "s" : ""}`}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.matchingWeights[step] ?? 0}
                  onChange={(e) => updateWeight(step, Number(e.target.value))}
                  className="w-full bg-[#111d32] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded px-2 py-1 text-center"
                />
                <span className="text-xs text-[#64748b]">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-[#10b981]" />
          <h3 className="text-base font-semibold text-[#e2e8f0]">
            Data Management
          </h3>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExport}
              className="bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            >
              <Download size={14} className="mr-2" />
              Export All Data
            </Button>
          </div>

          <div className="bg-[#0d1f35] rounded-lg p-3 border border-[#1e3a5f]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-[#94a3b8]">
                Import Data (JSON)
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-xs flex items-center gap-1 text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                >
                  <Upload size={12} />
                  Upload File
                </label>
              </div>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON data here..."
              className="w-full h-24 bg-[#111d32] border border-[#1e3a5f] text-[#e2e8f0] text-xs rounded-lg px-3 py-2 resize-none focus:border-[#3b82f6] focus:outline-none"
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={handleImport}
                variant="outline"
                size="sm"
                className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
              >
                <Check size={14} className="mr-1" />
                Import Text
              </Button>
            </div>
          </div>

          <div className="border-t border-[#1e3a5f] pt-4">
            {!showClearConfirm ? (
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="outline"
                className="border-[#991b1b] text-[#ef4444] hover:bg-[#991b1b]/20"
              >
                <Trash2 size={14} className="mr-2" />
                Clear All Data
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <AlertTriangle size={16} className="text-[#f59e0b]" />
                <span className="text-sm text-[#e2e8f0]">
                  Are you sure? This cannot be undone.
                </span>
                <Button
                  onClick={handleClear}
                  size="sm"
                  className="bg-[#ef4444] hover:bg-[#dc2626] text-white"
                >
                  Yes, Clear All
                </Button>
                <Button
                  onClick={() => setShowClearConfirm(false)}
                  variant="outline"
                  size="sm"
                  className="border-[#1e3a5f] text-[#e2e8f0] hover:bg-[#1a2d4a]"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Management */}
      {currentUser?.role === "admin" && (
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-[#8b5cf6]" />
            <h3 className="text-base font-semibold text-[#e2e8f0]">
              User Management
            </h3>
          </div>

          {/* Add User */}
          <div className="bg-[#0d1f35] rounded-lg p-3 border border-[#1e3a5f] mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                placeholder="Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="bg-[#111d32] border-[#1e3a5f] text-[#e2e8f0]"
              />
              <Input
                placeholder="Password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="bg-[#111d32] border-[#1e3a5f] text-[#e2e8f0]"
              />
              <select
                value={newUserRole}
                onChange={(e) =>
                  setNewUserRole(e.target.value as "admin" | "operator")
                }
                className="bg-[#111d32] border border-[#1e3a5f] text-[#e2e8f0] text-sm rounded-lg px-3"
              >
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                onClick={addUser}
                className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white"
              >
                <UserPlus size={14} className="mr-1" />
                Add User
              </Button>
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            {localUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0d1f35] rounded-lg px-4 py-2.5 border border-[#1e3a5f] gap-3 sm:gap-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white font-semibold text-xs">
                    {user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-[#e2e8f0] font-medium">
                      {user.name}
                    </p>
                    <p className="text-xs text-[#64748b] capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingUserId === user.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={editingPassword}
                        onChange={(e) => setEditingPassword(e.target.value)}
                        className="w-32 h-8 text-xs bg-[#111d32] border-[#1e3a5f] text-[#e2e8f0]"
                        placeholder="New Password"
                      />
                      <button
                        onClick={() => savePassword(user.id)}
                        className="p-1.5 rounded bg-[#10b981]/20 text-[#10b981] hover:bg-[#10b981]/30 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        className="p-1.5 rounded bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#94a3b8] font-mono bg-[#111d32] px-2 py-1 rounded border border-[#1e3a5f]">
                        {user.password}
                      </span>
                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditingPassword(user.password);
                        }}
                        className="p-1.5 rounded hover:bg-[#3b82f6]/20 text-[#64748b] hover:text-[#3b82f6] transition-colors"
                        title="Change Password"
                      >
                        <Key size={14} />
                      </button>
                      <button
                        onClick={() => removeUser(user.id)}
                        className="p-1.5 rounded hover:bg-[#991b1b]/20 text-[#64748b] hover:text-[#ef4444] transition-colors"
                        title="Remove User"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
