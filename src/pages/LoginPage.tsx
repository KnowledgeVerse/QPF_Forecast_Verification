import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, LogIn, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForecastStore } from "@/hooks/useForecastStore";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, addToast } = useForecastStore();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!name.trim() || !password.trim()) {
      addToast("Enter username and password", "error");
      return;
    }
    const success = login(name.trim(), password);
    if (success) {
      addToast("Logged in successfully", "success");
      navigate("/");
    } else {
      addToast("Invalid credentials", "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1a2d4a] border border-[#1e3a5f] shadow-[0_0_20px_rgba(59,130,246,0.3)] mb-4">
            <Cloud size={32} className="text-[#3b82f6] animate-bounce" />
          </div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">
            Rainfall Forecast
          </h1>
          <p className="text-sm text-[#94a3b8] mt-1">
            Rainfall Forecast Verification System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-[#e2e8f0] mb-4">Login</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Username
              </label>
              <Input
                placeholder="Enter username"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#94a3b8] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="bg-[#0d1f35] border-[#1e3a5f] text-[#e2e8f0] pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#e2e8f0] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white"
            >
              <LogIn size={16} className="mr-2" />
              Login
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1e3a5f]">
            <p className="text-xs text-[#64748b] text-center">
              Admin: Kamal / Kamal@007 | Operator: 42492 / 42492
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full mt-3 text-xs text-[#3b82f6] hover:text-[#60a5fa] text-center transition-colors"
          >
            Continue without login
          </button>
        </div>
      </div>

      <div className="w-full max-w-[900px] mt-8">
        <Footer />
      </div>
    </div>
  );
}
