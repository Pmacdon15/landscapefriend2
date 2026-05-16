"use client";

import { useForm } from "@tanstack/react-form";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Point } from "@/types/types";

interface SiteMapEditorProps {
  onSave?: (
    name: string,
    notes: string,
    polygons: Point[][],
    file?: File,
  ) => void;
  address: string;
  readOnlyPolygons?: Point[][] | null;
  initialPolygons?: Point[][] | null;
  initialNotes?: string;
  readOnly?: boolean;
}

export function SiteMapEditor({
  onSave,
  address,
  readOnlyPolygons,
  initialPolygons,
  initialNotes = "",
  readOnly = false,
}: SiteMapEditorProps) {
  const isReadOnly = readOnly || !!readOnlyPolygons;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [search, setSearch] = useState(address);
  const [mapImage, setMapImage] = useState("");

  // Normalize polygons to Point[][] to handle legacy data
  const normalizePolygons = useCallback(
    (data: Point[][] | Point[] | null | undefined): Point[][] => {
      if (!data) return [];
      if (data.length === 0) return [];
      if (!Array.isArray(data[0])) {
        // It's a legacy Point[]
        return [data as Point[]];
      }
      return data as Point[][];
    },
    [],
  );

  const [polygons, setPolygons] = useState<Point[][]>(() =>
    normalizePolygons(readOnlyPolygons || initialPolygons),
  );
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);

  // Transform state for drag and zoom
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  const handleSave = useCallback(
    (notes: string) => {
      if (!canvasRef.current) return;

      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `drawing-${Date.now()}.png`, {
            type: "image/png",
          });
          onSave?.("", notes, polygons, file);
        } else {
          onSave?.("", notes, polygons);
        }
      }, "image/png");
    },
    [onSave, polygons],
  );

  const form = useForm({
    defaultValues: {
      notes: initialNotes,
    },
    onSubmit: async ({ value }) => {
      handleSave(value.notes);
    },
  });

  const draw = useCallback(() => {
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

    const drawPolygon = (
      pts: Point[],
      isClosed: boolean,
      strokeColor: string,
      fillColor: string,
    ) => {
      if (pts.length === 0) return;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      for (const point of pts) {
        ctx.lineTo(point.x, point.y);
      }

      if (isClosed) {
        ctx.closePath();
        if (pts.length > 2) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 3 / scale;
      ctx.stroke();

      for (const point of pts) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
        ctx.fillStyle = strokeColor;
        ctx.fill();
      }
    };

    polygons.forEach((poly) => {
      drawPolygon(poly, true, "#22c55e", "rgba(34,197,94,0.35)");
    });

    drawPolygon(currentPoints, false, "#3b82f6", "rgba(59,130,246,0.35)");

    ctx.restore();
  }, [offset, scale, polygons, currentPoints]);

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const screenX = relX * (canvas.width / rect.width);
    const screenY = relY * (canvas.height / rect.height);
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
    if (dist < 5) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      setCurrentPoints((prev) => [...prev, point]);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const newScale = Math.max(0.1, Math.min(5, scale + delta * zoomSpeed));
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const relX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const relY = (e.clientY - rect.top) * (canvas.height / rect.height);
      const newOffset = {
        x: relX - (relX - offset.x) * (newScale / scale),
        y: relY - (relY - offset.y) * (newScale / scale),
      };
      setScale(newScale);
      setOffset(newOffset);
    }
  };

  const handleCloseCurrentArea = () => {
    if (currentPoints.length < 3) return;
    setPolygons((prev) => [...prev, currentPoints]);
    setCurrentPoints([]);
  };

  const handleClear = () => {
    setPolygons([]);
    setCurrentPoints([]);
    setOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const loadMap = useCallback(() => {
    if (!search) return;
    const encoded = encodeURIComponent(search);
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encoded}&zoom=20&size=1200x800&maptype=satellite&key=${key}`;
    setMapImage(url);
    if (!isReadOnly) {
      setPolygons([]);
      setCurrentPoints([]);
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
        draw();
      }
    };
  }, [mapImage, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {!isReadOnly && (
        <>
          <div className="grid grid-cols-1 gap-4">
            <form.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Notes</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Optional notes..."
                  />
                </div>
              )}
            </form.Field>
          </div>
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search address..."
              className="flex-1"
            />
            <Button type="button" onClick={loadMap}>
              Search
            </Button>
          </div>
        </>
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
              <p>• Close Area to finish polygon</p>
            </div>
          </div>
        )}
      </div>

      {!isReadOnly && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleCloseCurrentArea}
            disabled={currentPoints.length < 3}
            size="sm"
          >
            Close Current Area
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            size="sm"
          >
            Clear All
          </Button>
          <Button type="submit" disabled={polygons.length === 0} size="sm">
            Save Site Map
          </Button>
        </div>
      )}
    </form>
  );
}
