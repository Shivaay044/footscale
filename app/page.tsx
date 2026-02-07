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

function getInstruction(step: number, marking: boolean): string {
  if (!marking) return "Scroll & adjust image. Tap “Start Marking” when ready.";

  const steps = [
    "Step 1: Tap LEFT edge of A4 paper",
    "Step 2: Tap RIGHT edge of A4 paper",
    "Step 3: Tap TOE of foot",
    "Step 4: Tap HEEL of foot",
    "Measurement complete ✅",
  ];
  return steps[step] ?? "";
}

/* ================= COMPONENT ================= */

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [isMarking, setIsMarking] = useState<boolean>(false);

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
      setIsMarking(false);
    };

    img.src = URL.createObjectURL(file);
  }

  /* ---------- POINTER HANDLING ---------- */

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>): void {
    if (!isMarking || !image || points.length >= 4) return;

    e.preventDefault();

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

  /* ---------- AUTO STOP MARKING ---------- */

  useEffect(() => {
    if (points.length === 4) {
      setIsMarking(false);

      const paperWidthPx = distance(points[0], points[1]);
      const footPx = distance(points[2], points[3]);

      const mmPerPixel = 210 / paperWidthPx;
      const footMM = footPx * mmPerPixel;

      setResult({
        mm: footMM.toFixed(1),
        size: getShoeSize(footMM),
      });
    }
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
    setIsMarking(false);
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
          fontSize: 14,
          color: "#555",
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
        {getInstruction(points.length, isMarking)}
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

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <button
          onClick={() => setIsMarking(true)}
          disabled={!image || isMarking}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            background: isMarking ? "#2563eb" : "#e5e7eb",
            color: isMarking ? "#fff" : "#000",
            border: "none",
            fontWeight: 600,
          }}
        >
          {isMarking ? "Marking Enabled" : "Start Marking"}
        </button>

        <button
          onClick={resetMeasurement}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            background: "#111827",
            color: "#fff",
            border: "none",
            fontWeight: 600,
          }}
        >
          Reset
        </button>
      </div>

      {/* Canvas Container */}
      <div
        style={{
          maxHeight: "65vh",
          overflow: "auto",
          borderRadius: 10,
          border: "1px solid #ddd",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          style={{
            width: "100%",
            display: "block",
            background: "#fafafa",
            touchAction: isMarking ? "none" : "pan-y",
          }}
        />
      </div>

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
