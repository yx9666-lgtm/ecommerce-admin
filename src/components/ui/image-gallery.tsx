"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  thumbnailSize?: number;
}

export function ImageGallery({ images, alt = "", thumbnailSize = 40 }: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);

  const hasImages = images.length > 0;
  const thumb = images[0];

  const prev = () => setCurrent((c) => (c > 0 ? c - 1 : images.length - 1));
  const next = () => setCurrent((c) => (c < images.length - 1 ? c + 1 : 0));

  return (
    <>
      <div
        className={`relative cursor-pointer group mx-auto`}
        style={{ width: thumbnailSize, height: thumbnailSize }}
        onClick={() => {
          if (hasImages) {
            setCurrent(0);
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
            {images.length > 1 && (
              <span className="absolute -top-1 -right-1 bg-gold-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {images.length}
              </span>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
            <Package className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black/95 border-0 overflow-hidden">
          <DialogTitle className="sr-only">商品图片</DialogTitle>

          {/* Main image */}
          <div className="relative flex items-center justify-center min-h-[400px] max-h-[70vh]">
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 text-white/70 hover:text-white hover:bg-white/10 h-10 w-10"
                onClick={prev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            <img
              src={images[current]}
              alt={`${alt} ${current + 1}`}
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />

            {images.length > 1 && (
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
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 px-4 pb-4">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                    idx === current ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                  onClick={() => setCurrent(idx)}
                >
                  <img src={img} alt={`${alt} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              <span className="text-white/50 text-xs ml-2">
                {current + 1} / {images.length}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
