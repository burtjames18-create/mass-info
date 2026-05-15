"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"visible" | "fading-out" | "fading-in">("visible");
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setPhase("fading-out");
      const fadeOut = setTimeout(() => {
        setDisplayChildren(children);
        setPhase("fading-in");
      }, 180);
      const fadeIn = setTimeout(() => { setPhase("visible"); }, 360);
      return () => { clearTimeout(fadeOut); clearTimeout(fadeIn); };
    } else {
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  const opacity =
    phase === "fading-out" ? "opacity-0" :
    phase === "fading-in" ? "opacity-0 animate-page-enter" : "opacity-100";

  return (
    <div className={`transition-opacity duration-180 ease-in-out ${opacity}`}>
      {displayChildren}
    </div>
  );
}
