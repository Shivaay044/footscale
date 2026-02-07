"use client";

import { useEffect, useRef, useState } from "react";

/* ================= TYPES ================= */

type Point = { x: number; y: number };
type Result = { mm: string; size: string };

type Transform = {
  scale: number;
  x: number;
  y: number;
};

/* ================= HELPERS ================= */

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getShoeSize(mm: number) {
  if (mm < 240) return "UK 5";
  if (mm < 250) return "UK 6";
  if (mm < 260) return "UK 7";
  if (mm < 270) return "UK 8";
  if (mm < 280) return "UK 9";
  return "UK 10+";
}

function getInstruction(step: number, marking: boolean) {
  if (!marking) return "Pinch to zoom • Drag to move • Tap Start Marking";

  const steps = [
    "Tap LEFT edge of A4 paper",
    "Tap RIGHT edge of A4 paper",
    "Tap TOE of foot",
    "Tap HEEL of foot",
    "Measurement complete ✅",
  ];
  return steps[step] ?? "";
}

/* ================= COMPONENT ================= */

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    x: 0,
    y: 0,
  });

  /* ================= DRAW ================= */

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    // MOBILE FRIENDLY POINTS
    const radius = Math.max(14, 18 / transform.scale);

    points.forEach((p, i) => {
      const sx = p.x * transform.scale + transform.x;
      const sy = p.y * transform.scale + transform.y;

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = i < 2 ? "#2563eb" : "#dc2626";
      ctx.fill();

      // white border for visibility
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    });
  }

  useEffect(redraw, [image, transform, points]);

  /* ================= IMAGE UPLOAD ================= */

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;

      // Responsive fit to phone screen
      const maxWidth = container.clientWidth;
      const scale = maxWidth / img.width;

      canvas.width = img.width;
      canvas.height = img.height;

      setTransform({
        scale,
        x: 0,
        y: 0,
      });

      setImage(img);
      setPoints([]);
      setResult(null);
      setIsMarking(false);
    };

    img.src = URL.createObjectURL(file);
  }

  /* ================= COORDINATE FIX ================= */

  function getImageCoords(e: React.PointerEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;

    return {
      x: (cx - transform.x) / transform.scale,
      y: (cy - transform.y) / transform.scale,
    };
  }

  /* ================= POINTER EVENTS ================= */

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);

    pointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });

    if (isMarking && points.length < 4 && pointers.current.size === 1) {
      setPoints((p) => [...p, getImageCoords(e)]);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(e.pointerId)) return;

    const prev = pointers.current.get(e.pointerId)!;
    const curr = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, curr);

    // PAN
    if (pointers.current.size === 1 && !isMarking) {
      setTransform((t) => ({
        ...t,
        x: t.x + (curr.x - prev.x),
        y: t.y + (curr.y - prev.y),
      }));
    }

    // PINCH ZOOM
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const d = distance(pts[0], pts[1]);

      if (lastPinchDist.current) {
        const factor = d / lastPinchDist.current;
        setTransform((t) => ({
          ...t,
          scale: Math.min(6, Math.max(0.8, t.scale * factor)),
        }));
      }
      lastPinchDist.current = d;
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
  }

  /* ================= MEASUREMENT ================= */

  useEffect(() => {
    if (points.length === 4) {
      setIsMarking(false);

      const paperPx = distance(points[0], points[1]);
      const footPx = distance(points[2], points[3]);
      const mm = (footPx * 210) / paperPx;

      setResult({
        mm: mm.toFixed(1),
        size: getShoeSize(mm),
      });
    }
  }, [points]);

  function reset() {
    setPoints([]);
    setResult(null);
    setIsMarking(false);
  }

  /* ================= UI ================= */

  return (
    <main style={{ maxWidth: 480, margin: "auto", padding: 16 }}>
      <h2 style={{ textAlign: "center" }}>👣 Foot Measurement</h2>

      <div
        style={{
          background: "#eef2ff",
          padding: 10,
          borderRadius: 8,
          textAlign: "center",
          fontSize: 14,
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        {getInstruction(points.length, isMarking)}
      </div>

      <input type="file" accept="image/*" onChange={handleImageUpload} />

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={() => setIsMarking(true)}
          disabled={!image}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            background: isMarking ? "#2563eb" : "#e5e7eb",
            color: isMarking ? "#fff" : "#000",
            border: "none",
            fontWeight: 700,
          }}
        >
          Start Marking
        </button>

        <button
          onClick={reset}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            background: "#111827",
            color: "#fff",
            border: "none",
            fontWeight: 700,
          }}
        >
          Reset
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          marginTop: 12,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid #ddd",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ width: "100%", display: "block" }}
        />
      </div>

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 14,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <h3>📏 Result</h3>
          <p>
            Foot Length: <b>{result.mm} mm</b>
          </p>
          <p>
            Recommended Size: <b>{result.size}</b>
          </p>
        </div>
      )}
    </main>
  );
}
