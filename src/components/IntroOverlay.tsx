"use client";
import { useEffect, useRef, useState } from "react";

export default function IntroOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const played = sessionStorage.getItem("intro-played");
    if (played) { setDone(true); return; }
    sessionStorage.setItem("intro-played", "1");
    document.body.setAttribute("data-intro", "true");
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    const CX = W / 2;
    const CY = H / 2;

    // Timeline: 0–2400ms draw, 2400–3000ms hold + fade out
    const TOTAL = 2400;
    const FADE_START = 2500;
    const FADE_END = 3100;

    let start: number | null = null;
    let raf: number;
    let finished = false;

    // Scatter markers — fixed positions
    const markers = [
      { x: 0.08, y: 0.12 }, { x: 0.92, y: 0.18 }, { x: 0.05, y: 0.55 },
      { x: 0.95, y: 0.62 }, { x: 0.15, y: 0.88 }, { x: 0.82, y: 0.85 },
      { x: 0.45, y: 0.08 }, { x: 0.62, y: 0.93 }, { x: 0.28, y: 0.42 },
      { x: 0.75, y: 0.35 }, { x: 0.38, y: 0.75 }, { x: 0.88, y: 0.45 },
    ];

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 3); }
    function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
    function clamp(v: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }
    function phase(t: number, start: number, end: number) {
      return clamp((t - start) / (end - start));
    }

    function draw(now: number) {
      if (!start) start = now;
      const elapsed = now - start;
      const t = Math.min(elapsed / TOTAL, 1);

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // ── Phase 1 (0–0.15): Two horizontal lines sweep in from left & right edge ──
      const p1 = easeOut(clamp(t / 0.15));
      if (p1 > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.25 * p1})`;
        ctx.lineWidth = 0.5;

        // Top horizontal line — sweeps right from left edge
        const lx1 = p1 * W;
        ctx.beginPath();
        ctx.moveTo(0, CY - H * 0.22);
        ctx.lineTo(lx1, CY - H * 0.22);
        ctx.stroke();

        // Bottom horizontal line — sweeps left from right edge
        const lx2 = W - p1 * W;
        ctx.beginPath();
        ctx.moveTo(W, CY + H * 0.22);
        ctx.lineTo(lx2, CY + H * 0.22);
        ctx.stroke();
      }

      // ── Phase 2 (0.08–0.30): Two vertical lines sweep in ──
      const p2 = easeOut(clamp(phase(t, 0.08, 0.30)));
      if (p2 > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.2 * p2})`;
        ctx.lineWidth = 0.5;

        const vy1 = p2 * H;
        ctx.beginPath();
        ctx.moveTo(CX - W * 0.28, 0);
        ctx.lineTo(CX - W * 0.28, vy1);
        ctx.stroke();

        const vy2 = H - p2 * H;
        ctx.beginPath();
        ctx.moveTo(CX + W * 0.28, H);
        ctx.lineTo(CX + W * 0.28, vy2);
        ctx.stroke();
      }

      // ── Phase 3 (0.15–0.45): Corner brackets close in ──
      const p3 = easeOut(clamp(phase(t, 0.15, 0.45)));
      if (p3 > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * p3})`;
        ctx.lineWidth = 1;
        const bSize = 40 * p3;
        const margin = 40 + (1 - p3) * 120;

        const corners = [
          { x: margin,   y: margin,   dx: 1,  dy: 1  },
          { x: W-margin, y: margin,   dx: -1, dy: 1  },
          { x: margin,   y: H-margin, dx: 1,  dy: -1 },
          { x: W-margin, y: H-margin, dx: -1, dy: -1 },
        ];

        for (const c of corners) {
          ctx.beginPath();
          ctx.moveTo(c.x, c.y + c.dy * bSize);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(c.x + c.dx * bSize, c.y);
          ctx.stroke();
        }
      }

      // ── Phase 4 (0.25–0.55): Crosshair lines extend from center ──
      const p4 = easeOut(clamp(phase(t, 0.25, 0.55)));
      if (p4 > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.15 * p4})`;
        ctx.lineWidth = 0.5;

        // Horizontal crosshair
        ctx.beginPath();
        ctx.moveTo(CX - p4 * CX * 0.85, CY);
        ctx.lineTo(CX + p4 * CX * 0.85, CY);
        ctx.stroke();

        // Vertical crosshair
        ctx.beginPath();
        ctx.moveTo(CX, CY - p4 * CY * 0.85);
        ctx.lineTo(CX, CY + p4 * CY * 0.85);
        ctx.stroke();
      }

      // ── Phase 5 (0.30–0.55): Center diamond / reticle ──
      const p5 = easeOut(clamp(phase(t, 0.30, 0.55)));
      if (p5 > 0) {
        const rSize = 14 * p5;
        ctx.strokeStyle = `rgba(255,255,255,${0.7 * p5})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(CX, CY - rSize);
        ctx.lineTo(CX + rSize, CY);
        ctx.lineTo(CX, CY + rSize);
        ctx.lineTo(CX - rSize, CY);
        ctx.closePath();
        ctx.stroke();

        // Inner dot
        if (p5 > 0.5) {
          const dp = (p5 - 0.5) * 2;
          ctx.fillStyle = `rgba(255,255,255,${dp * 0.9})`;
          ctx.beginPath();
          ctx.arc(CX, CY, 2 * dp, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Phase 6 (0.40–0.75): Grid of thin tick marks ──
      const p6 = easeInOut(clamp(phase(t, 0.40, 0.75)));
      if (p6 > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.08 * p6})`;
        ctx.lineWidth = 0.5;
        const cols = 8, rows = 6;
        const gx = W / cols, gy = H / rows;
        for (let c = 1; c < cols; c++) {
          for (let r = 1; r < rows; r++) {
            const px = c * gx, py = r * gy;
            const tLen = 5 * p6;
            ctx.beginPath();
            ctx.moveTo(px - tLen, py); ctx.lineTo(px + tLen, py);
            ctx.moveTo(px, py - tLen); ctx.lineTo(px, py + tLen);
            ctx.stroke();
          }
        }
      }

      // ── Phase 7 (0.50–0.85): Scatter + markers pop in ──
      for (let i = 0; i < markers.length; i++) {
        const mStart = 0.50 + (i / markers.length) * 0.25;
        const pm = easeOut(clamp(phase(t, mStart, mStart + 0.12)));
        if (pm > 0) {
          const mx = markers[i].x * W;
          const my = markers[i].y * H;
          ctx.fillStyle = `rgba(255,255,255,${0.3 * pm})`;
          ctx.font = `${9 * pm}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", mx, my);
        }
      }

      // ── Phase 8 (0.60–0.80): Scan line sweeping top to bottom ──
      const p8 = easeInOut(clamp(phase(t, 0.60, 0.80)));
      if (p8 > 0 && p8 < 1) {
        const scanY = p8 * H;
        const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 4);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(0.7, "rgba(255,255,255,0.04)");
        grad.addColorStop(1, "rgba(255,255,255,0.12)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 30, W, 34);
      }

      // ── Phase 9 (0.75–1.0): Additional framing lines ──
      const p9 = easeOut(clamp(phase(t, 0.75, 1.0)));
      if (p9 > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.12 * p9})`;
        ctx.lineWidth = 0.5;

        // Second horizontal pair
        const hLen = p9 * W * 0.25;
        ctx.beginPath();
        ctx.moveTo(W * 0.1, H * 0.5); ctx.lineTo(W * 0.1 + hLen, H * 0.5);
        ctx.moveTo(W * 0.9, H * 0.5); ctx.lineTo(W * 0.9 - hLen, H * 0.5);
        ctx.stroke();
      }

      // ── Fade out overlay ──
      if (elapsed > FADE_START) {
        const fp = clamp((elapsed - FADE_START) / (FADE_END - FADE_START));
        ctx.fillStyle = `rgba(0,0,0,${fp})`;
        ctx.fillRect(0, 0, W, H);

        if (fp >= 1 && !finished) {
          finished = true;
          document.body.removeAttribute("data-intro");
          setDone(true);
          setVisible(false);
        }
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  if (done) return null;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
