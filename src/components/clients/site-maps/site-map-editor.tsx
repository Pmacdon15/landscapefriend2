"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Point = {
  x: number;
  y: number;
};

interface SiteMapEditorProps {
  onSave?: (points: Point[], file?: File) => void;
  address: string;
  readOnlyPoints?: Point[] | null;
}

export function SiteMapEditor({
  onSave,
  address,
  readOnlyPoints,
}: SiteMapEditorProps) {
  const isReadOnly = !!readOnlyPoints;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [search, setSearch] = useState(address);
  const [mapImage, setMapImage] = useState("");
  const [points, setPoints] = useState<Point[]>(readOnlyPoints || []);
  const [closed, setClosed] = useState(isReadOnly);

  // Transform state for drag and zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const draw = useCallback(
    (nextPoints: Point[], isClosed: boolean) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      if (!canvas || !image) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply transformations
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Draw Map Image
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      if (nextPoints.length === 0) {
        ctx.restore();
        return;
      }

      // Draw Polygon
      ctx.beginPath();
      ctx.moveTo(nextPoints[0].x, nextPoints[0].y);

      for (const point of nextPoints) {
        ctx.lineTo(point.x, point.y);
      }

      if (isClosed) {
        ctx.closePath();
      }

      if (nextPoints.length > 2) {
        ctx.fillStyle = "rgba(34,197,94,0.35)";
        ctx.fill();
      }

      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3 / scale; // Keep line width consistent visually
      ctx.stroke();

      // Draw points/handles
      for (const point of nextPoints) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
        ctx.fillStyle = "#16a34a";
        ctx.fill();
      }

      ctx.restore();
    },
    [offset, scale],
  );

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // 1. Get relative pos in canvas element
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // 2. Adjust for internal canvas resolution vs display size
    const screenX = relX * (canvas.width / rect.width);
    const screenY = relY * (canvas.height / rect.height);

    // 3. Inverse transform: (screen - offset) / scale
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || isReadOnly) return;

    const dx =
      (e.clientX - lastMousePosRef.current.x) *
      (canvasRef.current
        ? canvasRef.current.width /
          canvasRef.current.getBoundingClientRect().width
        : 1);
    const dy =
      (e.clientY - lastMousePosRef.current.y) *
      (canvasRef.current
        ? canvasRef.current.height /
          canvasRef.current.getBoundingClientRect().height
        : 1);

    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    const dist = Math.sqrt(
      (e.clientX - lastMousePosRef.current.x) ** 2 +
        (e.clientY - lastMousePosRef.current.y) ** 2,
    );
    isDraggingRef.current = false;

    // Only add point if it was a click, not a drag
    if (dist < 5 && !closed) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      setPoints((prev) => [...prev, point]);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const newScale = Math.max(0.1, Math.min(5, scale + delta * zoomSpeed));

    const mousePos = { x: e.clientX, y: e.clientY };
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const relX = (mousePos.x - rect.left) * (canvas.width / rect.width);
      const relY = (mousePos.y - rect.top) * (canvas.height / rect.height);

      const newOffset = {
        x: relX - (relX - offset.x) * (newScale / scale),
        y: relY - (relY - offset.y) * (newScale / scale),
      };

      setScale(newScale);
      setOffset(newOffset);
    }
  };

  const handleClose = () => {
    if (points.length < 3) return;
    setClosed(true);
  };

  const handleClear = () => {
    setPoints([]);
    setClosed(false);
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;

    // We want to save both the points data and the flattened image
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `drawing-${Date.now()}.png`, {
          type: "image/png",
        });
        onSave?.(points, file);
      } else {
        onSave?.(points);
      }
    }, "image/png");
  };

  const loadMap = useCallback(() => {
    if (!search) return;
    const encoded = encodeURIComponent(search);
    const key = process["env"].NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=20&size=1200x800&maptype=satellite&key=${key}`;
    setMapImage(url);

    if (!isReadOnly) {
      setPoints([]);
      setClosed(false);
      setOffset({ x: 0, y: 0 });
      setScale(1);
    }
  }, [search, isReadOnly]);

  useEffect(() => {
    if (search) loadMap();
  }, [loadMap, search]);

  useEffect(() => {
    if (!mapImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = mapImage;
    img.onload = () => {
      imageRef.current = img;
      if (canvasRef.current) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        draw(points, closed);
      }
    };
  }, [mapImage, draw, points, closed]);

  useEffect(() => {
    draw(points, closed);
  }, [points, closed, draw]);

  return (
    <div className="space-y-4">
      {!isReadOnly && (
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address..."
            className="flex-1 rounded-md border px-3 py-2 text-sm bg-white dark:bg-slate-900"
          />
          <Button onClick={loadMap}>Search</Button>
        </div>
      )}

      <div className="relative group">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className={`w-full rounded-xl border bg-slate-100 dark:bg-slate-800 ${
            isReadOnly ? "cursor-default" : "cursor-crosshair"
          }`}
          style={{ touchAction: "none" }}
        />
        {!isReadOnly && (
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg shadow text-[10px] space-y-1">
              <p>• Click to add points</p>
              <p>• Drag to move map</p>
              <p>• Scroll to zoom</p>
            </div>
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleClose}
            disabled={points.length < 3 || closed}
            size="sm"
          >
            Close Area
          </Button>
          <Button variant="outline" onClick={handleClear} size="sm">
            Clear
          </Button>
          <Button onClick={handleSave} disabled={!closed} size="sm">
            Save Area
          </Button>
        </div>
      )}
    </div>
  );
}
