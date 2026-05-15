"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const reset = () => { setUsername(""); setEmail(""); setPassword(""); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-black border border-white/15 text-white text-xs tracking-wider placeholder-white/20 focus:outline-none focus:border-white/50 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-black border border-white/20 p-8 w-full max-w-sm animate-fade-in-up">

        <div className="text-xs tracking-[0.3em] uppercase text-white/30 mb-6">
          {tab === "login" ? "Sign In" : "Create Account"}
        </div>

        <div className="flex mb-6 border border-white/10">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-2 text-xs tracking-widest uppercase transition-all ${
              tab === "login" ? "bg-white text-black" : "text-white/30 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 py-2 text-xs tracking-widest uppercase border-l border-white/10 transition-all ${
              tab === "register" ? "bg-white text-black" : "text-white/30 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === "register" && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              placeholder="Username"
              required
              minLength={3}
              maxLength={20}
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder={tab === "register" ? "Password (8+ chars)" : "Password"}
            required
            minLength={tab === "register" ? 8 : 1}
          />

          {error && (
            <div className="text-xs text-white/40 border border-white/10 px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-xs tracking-[0.25em] uppercase border border-white/30 hover:bg-white hover:text-black hover:border-white transition-all disabled:opacity-30"
          >
            {submitting ? "···" : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/20 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
