"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Package, ZoomIn, ZoomOut } from "lucide-react";
import { normalizeImageUrl } from "@/lib/image-url";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  thumbnailSize?: number;
}

export function ImageGallery({ images, alt = "", thumbnailSize = 40 }: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const normalizedImages = images.map((img) => normalizeImageUrl(img));

  const hasImages = normalizedImages.length > 0;
  const thumb = normalizedImages[0];

  const clampZoom = (value: number) => Math.min(4, Math.max(1, value));
  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    setDragStart(null);
  };
  const applyZoom = (nextZoom: number) => {
    const clamped = clampZoom(nextZoom);
    setZoom(clamped);
    if (clamped === 1) {
      setOffset({ x: 0, y: 0 });
      setDragging(false);
      setDragStart(null);
    }
  };
  const zoomIn = () => applyZoom(zoom + 0.25);
  const zoomOut = () => applyZoom(zoom - 0.25);
  const startDrag = (clientX: number, clientY: number) => {
    if (zoom <= 1) return;
    setDragging(true);
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };
  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragging || !dragStart || zoom <= 1) return;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };
  const stopDrag = () => {
    setDragging(false);
    setDragStart(null);
  };
  const prev = () => {
    setCurrent((c) => (c > 0 ? c - 1 : normalizedImages.length - 1));
    resetView();
  };
  const next = () => {
    setCurrent((c) => (c < normalizedImages.length - 1 ? c + 1 : 0));
    resetView();
  };

  return (
    <>
      <div
        className={`relative cursor-pointer group mx-auto`}
        style={{ width: thumbnailSize, height: thumbnailSize }}
        onClick={() => {
          if (hasImages) {
            setCurrent(0);
            resetView();
            setOpen(true);
          }
        }}
      >
        {hasImages ? (
          <>
            <img
              src={thumb}
              alt={alt}
              className="w-full h-full rounded-lg object-cover"
            />
            {normalizedImages.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-gold-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {normalizedImages.length}
              </span>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetView();
        }}
      >
        <DialogContent className="w-[92vw] max-w-5xl h-[85vh] p-0 bg-black/95 border-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">商品图片</DialogTitle>

          {/* Main image */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-hidden"
            onWheel={(e) => {
              if (!hasImages) return;
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.2 : -0.2;
              applyZoom(zoom + delta);
            }}
          >
            {hasImages && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-black/60 rounded-md p-1 text-white">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={zoomOut}
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono min-w-12 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/10"
                  onClick={zoomIn}
                  disabled={zoom >= 4}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-white/80 hover:text-white hover:bg-white/10"
                  onClick={resetView}
                  disabled={zoom === 1}
                >
                  100%
                </Button>
              </div>
            )}
            {normalizedImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 text-white/70 hover:text-white hover:bg-white/10 h-10 w-10"
                onClick={prev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <div
              className={`w-full h-full flex items-center justify-center overflow-hidden px-14 py-4 select-none ${
                zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                startDrag(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchStart={(e) => {
                if (e.touches.length !== 1) return;
                const touch = e.touches[0];
                startDrag(touch.clientX, touch.clientY);
              }}
              onTouchMove={(e) => {
                if (e.touches.length !== 1) return;
                const touch = e.touches[0];
                moveDrag(touch.clientX, touch.clientY);
              }}
              onTouchEnd={stopDrag}
            >
              <img
                src={normalizedImages[current]}
                alt={`${alt} ${current + 1}`}
                draggable={false}
                className="max-w-full max-h-full object-contain mx-auto transition-transform duration-150 ease-out origin-center"
                style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }}
              />
            </div>

            {normalizedImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 text-white/70 hover:text-white hover:bg-white/10 h-10 w-10"
                onClick={next}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>

          {/* Thumbnail strip */}
          {normalizedImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 pb-4">
              {normalizedImages.map((img, idx) => (
                <button
                  key={idx}
                  className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                    idx === current ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                  onClick={() => {
                    setCurrent(idx);
                    resetView();
                  }}
                >
                  <img src={img} alt={`${alt} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              <span className="text-white/50 text-xs ml-2">
                {current + 1} / {normalizedImages.length}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
