/**
 * LoginScreen — Shown when the user has no active session.
 * Only renders a "Continue with Google" button; no other nav is exposed.
 */

interface LoginScreenProps {
  onSignIn: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function LoginScreen({ onSignIn, loading, error }: LoginScreenProps) {
  return (
    <div className="w-72 min-h-[320px] flex flex-col items-center justify-center p-6 bg-white">
      {/* Product identity */}
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
          <MoonIcon />
        </div>
        <h1 className="text-lg font-bold text-gray-900">Sleep Reset</h1>
        <p className="text-xs text-gray-500 text-center">
          Corrige tu horario de sueño paso a paso
        </p>
      </div>

      {/* Sign-in button */}
      <button
        onClick={onSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading ? (
          <SpinnerIcon />
        ) : (
          <GoogleIcon />
        )}
        {loading ? "Iniciando sesión…" : "Continuar con Google"}
      </button>

      {/* Inline error — no toast */}
      {error !== null && (
        <p className="mt-3 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}

// ─── Internal icons ────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg
      className="w-6 h-6 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-gray-500"
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
  );
}
