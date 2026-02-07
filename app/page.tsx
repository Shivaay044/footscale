"use client";

import { useEffect, useRef, useState } from "react";

/* ================= TYPES ================= */

type Point = { x: number; y: number };
type Result = { mm: string; size: string };

/* ================= HELPERS ================= */

const A4_WIDTH_MM = 210;

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getShoeSize(mm: number): string {
  if (mm < 240) return "UK 5";
  if (mm < 250) return "UK 6";
  if (mm < 260) return "UK 7";
  if (mm < 270) return "UK 8";
  if (mm < 280) return "UK 9";
  return "UK 10+";
}

function getInstruction(step: number, marking: boolean): string {
  if (!marking) return "Zoom & pan image. Tap “Start Marking” when ready.";

  return (
    [
      "Tap LEFT edge of A4 paper",
      "Tap RIGHT edge of A4 paper",
      "Tap TOE of foot",
      "Tap HEEL of foot",
      "Done ✅",
    ][step] ?? ""
  );
}

/* ================= COMPONENT ================= */

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [isMarking, setIsMarking] = useState(false);

  /* ---- Transform state ---- */
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  /* ================= IMAGE LOAD ================= */

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width;
      canvas.height = img.height;

      setImage(img);
      setPoints([]);
      setResult(null);
      setScale(1);
      setOffset({ x: 0, y: 0 });

      redraw(img, [], 1, { x: 0, y: 0 });
    };

    img.src = URL.createObjectURL(file);
  }

  /* ================= DRAW ================= */

  function redraw(
    img: HTMLImageElement,
    pts: Point[],
    sc: number,
    off: { x: number; y: number }
  ) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(sc, 0, 0, sc, off.x, off.y);
    ctx.drawImage(img, 0, 0);

    pts.forEach((p, i) => {
      ctx.fillStyle = i < 2 ? "#2563eb" : "#dc2626";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 / sc, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  useEffect(() => {
    if (image) redraw(image, points, scale, offset);
  }, [points, scale, offset]);

  /* ================= POINTER ================= */

  function toImageCoords(e: React.PointerEvent): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;
    return { x, y };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!image) return;

    if (isMarking) {
      if (points.length >= 4) return;
      const p = toImageCoords(e);
      setPoints((prev) => [...prev, p]);
    } else {
      isPanning.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isPanning.current) return;

    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;

    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }

  function onPointerUp() {
    isPanning.current = false;
  }

  /* ================= ZOOM ================= */

  function zoom(factor: number) {
    setScale((s) => Math.min(4, Math.max(1, s * factor)));
  }

  /* ================= CALCULATION ================= */

  useEffect(() => {
    if (points.length !== 4) return;

    setIsMarking(false);

    const paperPx = distance(points[0], points[1]);
    const footPx = distance(points[2], points[3]);

    const mm = (footPx * A4_WIDTH_MM) / paperPx;

    setResult({
      mm: mm.toFixed(1),
      size: getShoeSize(mm),
    });
  }, [points]);

  /* ================= UI ================= */

  return (
    <main style={{ maxWidth: 500, margin: "auto", padding: 16 }}>
      <h2 style={{ textAlign: "center" }}>👣 Foot Measurement</h2>

      <p style={{ fontSize: 13, textAlign: "center", color: "#555" }}>
        Use pinch or buttons to zoom. Mark points accurately.
      </p>

      <div
        style={{
          background: "#eff6ff",
          padding: 10,
          borderRadius: 8,
          textAlign: "center",
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {getInstruction(points.length, isMarking)}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {/* Controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button onClick={() => zoom(1.2)}>＋</button>
        <button onClick={() => zoom(0.8)}>－</button>
        <button onClick={() => setIsMarking(true)}>Start Marking</button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          width: "100%",
          height: "70vh",
          border: "1px solid #ccc",
          touchAction: "none",
        }}
      />

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            background: "#f0fdf4",
          }}
        >
          <b>Foot Length:</b> {result.mm} mm <br />
          <b>Recommended Size:</b> {result.size}
        </div>
      )}
    </main>
  );
}
