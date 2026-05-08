import { useState } from "react";
import { useAuth } from "../../src/hooks/useAuth";
import { LoginScreen } from "../../src/components/LoginScreen";
import { BottomNav } from "../../src/components/BottomNav";
import type { ActivePanel } from "../../src/components/BottomNav";
import { HomePanel } from "../../src/components/panels/HomePanel";
import { HistoryPanel } from "../../src/components/panels/HistoryPanel";
import { SettingsPanel } from "../../src/components/panels/SettingsPanel";

export default function App() {
  const { session, loading, error, signInWithGoogle, signOut } = useAuth();
  const [activePanel, setActivePanel] = useState<ActivePanel>("home");

  // Loading state: session restore in progress
  if (loading) {
    return (
      <div className="w-[380px] min-h-[520px] flex items-center justify-center bg-white">
        <svg
          className="w-6 h-6 animate-spin text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }

  // Unauthenticated: always show login screen — no data is exposed
  if (session === null) {
    return <LoginScreen onSignIn={signInWithGoogle} loading={loading} error={error} />;
  }

  // Authenticated: panel shell with bottom navigation
  const { user } = session;
  const userInitial = user.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="w-[380px] min-h-[520px] flex flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {userInitial}
          </div>
          <span className="text-sm text-gray-700 truncate max-w-[200px]">{user.email}</span>
        </div>
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Salir
        </button>
      </header>

      {/* Panel content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activePanel === "home" && <HomePanel />}
        {activePanel === "history" && <HistoryPanel />}
        {activePanel === "settings" && <SettingsPanel />}
      </main>

      {/* Bottom navigation */}
      <BottomNav active={activePanel} onChange={setActivePanel} />
    </div>
  );
}
