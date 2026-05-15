"use client";
import { useState } from "react";
import Link from "next/link";
import TickerSearch from "./TickerSearch";
import { useAuth } from "./AuthProvider";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobile, setShowMobile] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-black border-b border-white/10 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6">
          {/* Logo */}
          <Link href="/" className="shrink-0" onClick={() => setShowMobile(false)}>
            <span className="text-xs tracking-[0.35em] uppercase text-white font-light">
              MASS<span className="text-white/30 mx-1.5">/</span>INFO
            </span>
          </Link>

          <div className="w-px h-3.5 bg-white/15 shrink-0 hidden sm:block" />

          {/* Search — hidden on mobile, shown on sm+ */}
          <div className="hidden sm:block flex-1">
            <TickerSearch />
          </div>

          {/* Desktop right side */}
          <div className="hidden sm:flex items-center gap-5 ml-auto shrink-0">
            {loading ? (
              <div className="w-16 h-4 shimmer" />
            ) : user ? (
              <>
                <Link href="/portfolio" className="text-xs tracking-[0.25em] uppercase text-white/35 hover:text-white transition-colors">Portfolio</Link>
                {user.isAdmin && (
                  <Link href="/admin" className="text-xs tracking-[0.25em] uppercase text-white/35 hover:text-white transition-colors">Admin</Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-white/35 hover:text-white transition-colors"
                  >
                    <span className="pulse-dot" />
                    {user.username}
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-3 w-36 bg-black border border-white/15 animate-fade-in-up z-50">
                      <Link href="/portfolio" onClick={() => setShowMenu(false)} className="block px-4 py-2.5 text-xs tracking-[0.2em] uppercase text-white/40 hover:text-white hover:bg-white/5 transition-colors">Portfolio</Link>
                      <div className="border-t border-white/10" />
                      <button onClick={() => { setShowMenu(false); logout(); }} className="w-full text-left px-4 py-2.5 text-xs tracking-[0.2em] uppercase text-white/40 hover:text-white hover:bg-white/5 transition-colors">Sign Out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button onClick={() => setShowAuth(true)} className="text-xs tracking-[0.25em] uppercase text-white/40 hover:text-white border border-white/20 hover:border-white/50 px-4 py-1.5 transition-all">
                Sign In
              </button>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex sm:hidden items-center gap-3 ml-auto">
            {!loading && !user && (
              <button onClick={() => setShowAuth(true)} className="text-xs tracking-wider uppercase text-white/40 border border-white/20 px-3 py-1 transition-all">
                Sign In
              </button>
            )}
            {!loading && user && (
              <span className="text-xs text-white/40 tracking-wider">{user.username}</span>
            )}
            {/* Hamburger */}
            <button onClick={() => setShowMobile(!showMobile)} className="flex flex-col gap-1 p-1" aria-label="Menu">
              <span className={`block w-5 h-px bg-white/60 transition-all ${showMobile ? "rotate-45 translate-y-1.5" : ""}`} />
              <span className={`block w-5 h-px bg-white/60 transition-all ${showMobile ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-px bg-white/60 transition-all ${showMobile ? "-rotate-45 -translate-y-1.5" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {showMobile && (
          <div className="sm:hidden border-t border-white/10 bg-black animate-fade-in">
            <div className="px-4 py-3">
              <TickerSearch />
            </div>
            <div className="border-t border-white/8 px-4 py-3 flex flex-col gap-3">
              {user ? (
                <>
                  <Link href="/portfolio" onClick={() => setShowMobile(false)} className="text-xs tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors py-1">Portfolio</Link>
                  {user.isAdmin && <Link href="/admin" onClick={() => setShowMobile(false)} className="text-xs tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors py-1">Admin</Link>}
                  <button onClick={() => { setShowMobile(false); logout(); }} className="text-left text-xs tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors py-1">Sign Out</button>
                </>
              ) : (
                <button onClick={() => { setShowMobile(false); setShowAuth(true); }} className="text-left text-xs tracking-[0.25em] uppercase text-white/40 hover:text-white transition-colors py-1">Sign In</button>
              )}
            </div>
          </div>
        )}
      </nav>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
