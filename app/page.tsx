"use client";

import { useEffect, useRef, useState } from "react";

/* ================= TYPES ================= */

type Point = { x: number; y: number };
type Result = { mm: number };

type Transform = {
  scale: number;
  x: number;
  y: number;
};

type SizeSystem = "UK" | "US" | "IND";

/* ================= HELPERS ================= */

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getUKSize(mm: number) {
  if (mm < 240) return 5;
  if (mm < 250) return 6;
  if (mm < 260) return 7;
  if (mm < 270) return 8;
  if (mm < 280) return 9;
  return 10;
}

function convertSize(uk: number, system: SizeSystem) {
  switch (system) {
    case "US":
      return uk + 1;
    case "IND":
      return uk;
    default:
      return uk;
  }
}

function getInstruction(step: number, marking: boolean) {
  if (!marking)
    return "Pinch to zoom • Drag to move • Tap Start Marking";

  const steps = [
    "Select LEFT edge of A4 paper",
    "Select RIGHT edge of A4 paper",
    "Select TOE of foot",
    "Select HEEL of foot",
    "Measurement complete ✅",
  ];
  return steps[step] ?? "";
}

/* ================= COMPONENT ================= */

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const magnifierRef = useRef<HTMLCanvasElement | null>(null);

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sizeSystem, setSizeSystem] = useState<SizeSystem>("UK");
  const [isMarking, setIsMarking] = useState(false);

  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    x: 0,
    y: 0,
  });

  const [showMagnifier, setShowMagnifier] = useState(false);

  /* ================= DRAW ================= */

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);
    ctx.drawImage(image, 0, 0);
    ctx.restore();

    const radius = window.innerWidth < 768 ? 18 : 12;

    points.forEach((p, i) => {
      const sx = p.x * transform.scale + transform.x;
      const sy = p.y * transform.scale + transform.y;

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = i < 2 ? "#2563eb" : "#dc2626";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    });

    if (previewPoint) {
      const sx = previewPoint.x * transform.scale + transform.x;
      const sy = previewPoint.y * transform.scale + transform.y;

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  useEffect(redraw, [image, transform, points, previewPoint]);

  /* ================= MAGNIFIER ================= */

  function drawMagnifier(p: Point) {
    const mag = magnifierRef.current;
    if (!mag || !image) return;

    const ctx = mag.getContext("2d")!;
    const size = mag.width;
    const zoom = 4;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(
      image,
      p.x - size / (2 * zoom),
      p.y - size / (2 * zoom),
      size / zoom,
      size / zoom,
      0,
      0,
      size,
      size
    );

    ctx.restore();

    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
  }

  /* ================= IMAGE LOAD ================= */

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const container = containerRef.current!;
      const fitScale = container.clientWidth / img.width;

      canvas.width = img.width;
      canvas.height = img.height;

      setTransform({ scale: fitScale, x: 0, y: 0 });
      setImage(img);
      setPoints([]);
      setPreviewPoint(null);
      setResult(null);
      setShowModal(false);
      setIsMarking(false);
    };

    img.src = URL.createObjectURL(file);
  }

  /* ================= COORDS ================= */

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

  /* ================= POINTER ================= */

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (!isMarking) return;

    const p = getImageCoords(e);
    setPreviewPoint(p);
    setShowMagnifier(true);
    drawMagnifier(p);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(e.pointerId)) return;

    const prev = pointers.current.get(e.pointerId)!;
    const curr = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, curr);

    if (isMarking && pointers.current.size === 1) {
      const p = getImageCoords(e);
      setPreviewPoint(p);
      drawMagnifier(p);
      return;
    }

    if (pointers.current.size === 1 && !isMarking) {
      setTransform((t) => ({
        ...t,
        x: t.x + (curr.x - prev.x),
        y: t.y + (curr.y - prev.y),
      }));
    }

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
    setShowMagnifier(false);
    if (pointers.current.size < 2) lastPinchDist.current = null;
  }

  /* ================= ACTIONS ================= */

  function confirmPoint() {
    if (!previewPoint) return;
    setPoints((p) => [...p, previewPoint]);
    setPreviewPoint(null);
  }

  function undoLast() {
    setPoints((p) => p.slice(0, -1));
    setResult(null);
  }

  /* ================= MEASURE ================= */

  useEffect(() => {
    if (points.length === 4) {
      setIsMarking(false);
      const paperPx = distance(points[0], points[1]);
      const footPx = distance(points[2], points[3]);
      const mm = (footPx * 210) / paperPx;
      setResult({ mm });
      setShowModal(true);
    }
  }, [points]);

  const ukSize = result ? getUKSize(result.mm) : null;
  const finalSize =
    ukSize !== null ? convertSize(ukSize, sizeSystem) : null;

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
          fontWeight: 600,
          marginBottom: 10,
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
            background: "#2563eb",
            color: "#fff",
            fontWeight: 700,
            border: "none",
          }}
        >
          Start Marking
        </button>

        <button
          onClick={undoLast}
          disabled={points.length === 0}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 10,
            background: "#374151",
            color: "#fff",
            fontWeight: 700,
            border: "none",
          }}
        >
          Undo
        </button>
      </div>

      {previewPoint && (
        <button
          onClick={confirmPoint}
          style={{
            width: "100%",
            marginTop: 10,
            padding: 14,
            borderRadius: 12,
            background: "#22c55e",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            border: "none",
          }}
        >
          ✅ Confirm Point
        </button>
      )}

      <div
        ref={containerRef}
        style={{
          marginTop: 12,
          position: "relative",
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

        {showMagnifier && (
          <canvas
            ref={magnifierRef}
            width={140}
            height={140}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              borderRadius: "50%",
              border: "3px solid #2563eb",
              background: "#fff",
            }}
          />
        )}
      </div>

      {/* RESULT MODAL */}
      {showModal && result && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 50,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 480,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
            }}
          >
            <h3 style={{ textAlign: "center" }}>📏 Measurement Result</h3>

            <p style={{ textAlign: "center", marginTop: 8 }}>
              Foot Length: <b>{result.mm.toFixed(1)} mm</b>
            </p>

            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: 600 }}>Size System</label>
              <select
                value={sizeSystem}
                onChange={(e) =>
                  setSizeSystem(e.target.value as SizeSystem)
                }
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 10,
                  fontSize: 16,
                }}
              >
                <option value="UK">UK</option>
                <option value="US">US</option>
                <option value="IND">IND</option>
              </select>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 14,
                background: "#f0fdf4",
                textAlign: "center",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              Recommended Size: {finalSize}
            </div>

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: "100%",
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                background: "#111827",
                color: "#fff",
                fontWeight: 700,
                border: "none",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
