"use client";

import { useEffect, useRef, useState } from "react";

/* ================= TYPES ================= */

type Point = {
  x: number;
  y: number;
};

type Result = {
  mm: string;
  size: string;
};

/* ================= HELPERS ================= */

function distance(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getShoeSize(mm: number): string {
  if (mm < 240) return "UK 5";
  if (mm < 250) return "UK 6";
  if (mm < 260) return "UK 7";
  if (mm < 270) return "UK 8";
  if (mm < 280) return "UK 9";
  return "UK 10+";
}

function getInstruction(step: number): string {
  const steps = [
    "Step 1: Tap LEFT edge of A4 paper",
    "Step 2: Tap RIGHT edge of A4 paper",
    "Step 3: Tap TOE of foot",
    "Step 4: Tap HEEL of foot",
    "Measurement completed ✅",
  ];
  return steps[step] ?? "";
}

/* ================= COMPONENT ================= */

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<Result | null>(null);

  /* ---------- IMAGE UPLOAD ---------- */

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);
      setImage(img);
      setPoints([]);
      setResult(null);
    };

    img.src = URL.createObjectURL(file);
  }

  /* ---------- POINTER (MOBILE + DESKTOP) ---------- */

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!image || points.length >= 4) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = points.length < 2 ? "#2563eb" : "#dc2626";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();

    setPoints((prev) => [...prev, { x, y }]);
  }

  /* ---------- CALCULATION ---------- */

  useEffect(() => {
    if (points.length !== 4) return;

    const paperWidthPx = distance(points[0], points[1]);
    const footPx = distance(points[2], points[3]);

    const mmPerPixel = 210 / paperWidthPx;
    const footMM = footPx * mmPerPixel;

    setResult({
      mm: footMM.toFixed(1),
      size: getShoeSize(footMM),
    });
  }, [points]);

  /* ---------- RESET ---------- */

  function resetMeasurement(): void {
    if (!image || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(image, 0, 0);

    setPoints([]);
    setResult(null);
  }

  /* ================= UI ================= */

  return (
    <main
      style={{
        maxWidth: 480,
        margin: "auto",
        padding: 16,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center" }}>👣 Foot Measurement</h1>

      <p
        style={{
          textAlign: "center",
          color: "#555",
          fontSize: 14,
        }}
      >
        Print A4 paper at <b>100%</b>, place foot, take top photo
      </p>

      {/* Instruction */}
      <div
        style={{
          background: "#eff6ff",
          color: "#1e40af",
          padding: 10,
          borderRadius: 8,
          textAlign: "center",
          fontWeight: 600,
          marginBottom: 10,
          fontSize: 14,
        }}
      >
        {getInstruction(points.length)}
      </div>

      {/* Upload */}
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{
          width: "100%",
          marginBottom: 10,
          fontSize: 14,
        }}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          border: "1px solid #ddd",
          borderRadius: 10,
          touchAction: "none",
          background: "#fafafa",
        }}
      />

      {/* Reset */}
      <button
        onClick={resetMeasurement}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 12,
          borderRadius: 8,
          background: "#111827",
          color: "#fff",
          border: "none",
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Reset Measurement
      </button>

      {/* Result */}
      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <h2 style={{ marginBottom: 8 }}>📏 Result</h2>
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
