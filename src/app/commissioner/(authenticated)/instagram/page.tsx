"use client";

import { useEffect, useState } from "react";
import { Key, RefreshCw, CheckCircle2, XCircle, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function InstagramSettingsPage() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function checkStatus() {
    try {
      const res = await fetch("/api/instagram/config");
      if (!res.ok) throw new Error("Failed to check status");
      const data = await res.json();
      
      setConnected(data.connected);
      if (data.connected) {
        setUsername(data.username || "Unknown Profile");
        setErrorMsg(data.error || "");
      }
    } catch (err) {
      console.error("Failed to check instagram config status:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/instagram/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to save configuration");
      } else {
        setSuccessMsg(data.error ? "Configuration saved, but token verification failed." : "Instagram account successfully connected!");
        setConnected(true);
        setUsername(data.username || "Unknown Profile");
        setToken("");
        if (data.error) {
          setErrorMsg(data.error);
        }
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred while connecting.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Instagram account? The gallery feed will fall back to default template posts.")) return;

    setDisconnecting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/instagram/config", {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || "Failed to disconnect account");
      } else {
        setConnected(false);
        setUsername("");
        setSuccessMsg("Instagram account disconnected successfully.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred while disconnecting.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-sm font-semibold text-slate-500">Checking connection status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Instagram Integration
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500">
            Connect your official Instagram account to fetch and display the social media gallery on the website home page.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Status Card */}
        <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                <InstagramIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Connection Status</h3>
                {connected ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Connected to @{username}
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
                    <XCircle className="h-4 w-4" />
                    Not Connected
                  </p>
                )}
              </div>
            </div>
            
            {connected && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 shadow-sm transition-all hover:bg-red-100 disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="mt-4 flex gap-2.5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold text-amber-800 border border-amber-100">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Token Warning</p>
                <p className="mt-0.5 leading-relaxed text-amber-700/90">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 flex gap-2.5 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="leading-relaxed">{successMsg}</p>
            </div>
          )}
        </div>

        {/* Connect Form */}
        <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Key className="h-4 w-4 text-slate-400" />
            {connected ? "Update Access Token" : "Link Instagram Account"}
          </h3>
          
          <p className="text-xs leading-relaxed text-slate-500 mb-6">
            Enter an Instagram Long-Lived User Access Token. You can generate a token by adding a test user inside the Instagram Basic Display product in your Meta Developer Console. Long-lived tokens last for 60 days but are refreshed automatically by the Graph API whenever the feed is fetched.
          </p>

          <form onSubmit={handleConnect} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Instagram Long-Lived Access Token
              </label>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="IGAAfmM5SkSYx..."
                rows={4}
                className="w-full rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-200/80 transition-all focus:bg-white focus:ring-2 focus:ring-inset focus:ring-violet-500 placeholder:text-slate-400"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <a
                href="https://developers.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
              >
                <span>Meta Developers Dashboard</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="submit"
                disabled={saving || !token.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600"
              >
                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>{connected ? "Update Connection" : "Connect Account"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
