"use client";

import { useEffect, useRef, useState } from "react";

/* ---------- HELPERS ---------- */

function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

function getShoeSize(mm) {
  if (mm < 240) return "UK 5";
  if (mm < 250) return "UK 6";
  if (mm < 260) return "UK 7";
  if (mm < 270) return "UK 8";
  if (mm < 280) return "UK 9";
  return "UK 10+";
}

function getInstruction(step) {
  const steps = [
    "Step 1: Tap LEFT edge of A4 paper",
    "Step 2: Tap RIGHT edge of A4 paper",
    "Step 3: Tap TOE of foot",
    "Step 4: Tap HEEL of foot",
    "Measurement complete ✅",
  ];
  return steps[step] || "";
}

/* ---------- COMPONENT ---------- */

export default function Home() {
  const canvasRef = useRef(null);

  const [image, setImage] = useState(null);
  const [points, setPoints] = useState([]);
  const [result, setResult] = useState(null);

  /* ---------- IMAGE UPLOAD ---------- */

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      setImage(img);
      setPoints([]);
      setResult(null);
    };

    img.src = URL.createObjectURL(file);
  }

  /* ---------- POINTER / TOUCH SUPPORT ---------- */

  function handlePointerDown(e) {
    if (!image) return;
    if (points.length >= 4) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const ctx = canvas.getContext("2d");

    // Color coding for clarity
    ctx.fillStyle = points.length < 2 ? "#2563eb" : "#dc2626"; // blue = paper, red = foot

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    setPoints((prev) => [...prev, { x, y }]);
  }

  /* ---------- CALCULATION ---------- */

  useEffect(() => {
    if (points.length === 4) {
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

  function resetMeasurement() {
    if (!image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);

    setPoints([]);
    setResult(null);
  }

  /* ---------- UI ---------- */

  return (
    <main style={{ maxWidth: 600, margin: "auto", padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>👣 Foot Measurement</h1>

      <p style={{ textAlign: "center", color: "#555" }}>
        Print an A4 page at <b>100% scale</b>, place foot, take top photo
      </p>

      <div
        style={{
          background: "#eff6ff",
          padding: 10,
          borderRadius: 8,
          marginBottom: 10,
          textAlign: "center",
          fontWeight: 500,
          color: "#1e40af",
        }}
      >
        {getInstruction(points.length)}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ marginBottom: 10 }}
      />

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: 8,
          touchAction: "none",
        }}
      />

      <button
        onClick={resetMeasurement}
        style={{
          width: "100%",
          marginTop: 10,
          padding: 10,
          borderRadius: 6,
          background: "#111827",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Reset Measurement
      </button>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            borderRadius: 10,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <h2 style={{ marginBottom: 10 }}>📏 Result</h2>
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
