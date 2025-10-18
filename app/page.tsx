"use client";

import type React from "react";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "./components/site-footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "./hooks/use-toast";
import { cn } from "@/lib/utils";
import { SiteHeader } from "./components/site-header";
import { FindRecycling } from "./components/find-recycling";
import { Recycle, ShieldAlert } from "lucide-react";

// Types
type UnifiedResponse = {
  top: { label: string; confidence: number };
  scores: Array<{ label: string; confidence: number }>;
  tip: string;
};

const ALL_CATEGORIES = [
  "cardboard",
  "glass",
  "metal",
  "paper",
  "plastic",
  "trash",
  "recyclable",
  "non-recyclable",
] as const;

// Tips by category or recycle result
const TIPS: Record<string, string> = {
  recyclable:
    "Rinse recyclables to remove food residue before placing them in the bin.",
  "non-recyclable":
    "Consider reusing or disposing of non-recyclables responsibly.",
  cardboard: "Flatten cardboard boxes to save space in the recycling bin.",
  glass: "Remove caps and rinse glass containers before recycling.",
  metal: "Clean metal cans and check local guidelines for aerosol cans.",
  paper: "Avoid recycling wet or heavily soiled paper.",
  plastic: "Check resin codes; not all plastics are accepted in every program.",
  trash:
    "If unsure, check your municipality’s waste guide to avoid contamination.",
};

// Image Uploader Component
import { UploadCloud } from "lucide-react";

function ImageUploader({
  onSelect,
  disabled,
}: {
  onSelect: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onSelect(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-3">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "group grid place-items-center rounded-2xl border-2 border-dashed border-primary/30 p-8 text-center bg-gradient-to-br from-green-50/60 to-blue-50/40 shadow-md transition-all duration-200 cursor-pointer hover:border-green-400 hover:bg-green-50/80 hover:shadow-lg",
          disabled && "opacity-50 pointer-events-none"
        )}
        aria-label="Drag and drop image"
      >
        <div className="flex flex-col items-center gap-2">
          <UploadCloud className="size-10 text-green-400 group-hover:text-green-600 transition" />
          <div className="text-base font-semibold text-green-700 group-hover:text-green-900">
            Drag & Drop Image
          </div>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP</p>
        </div>
      </div>
      <div className="grid gap-2">
        <Label
          htmlFor="uploader"
          className="text-sm font-medium text-muted-foreground"
        >
          Or upload
        </Label>
        <div className="flex-1 flex items-center h-full">
          <Input
            id="uploader"
            type="file"
            accept="image/*"
            onChange={onChange}
            disabled={!!disabled}
            className="w-full file:rounded-full file:bg-green-100 file:text-green-700 file:font-semibold file:border-0 file:px-4 file:py-2 file:mr-2 file:cursor-pointer hover:file:bg-green-200 transition"
            style={{ height: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

// Webcam Capture Component
import { Camera } from "lucide-react";

function WebcamCapture({
  onCapture,
  disabled,
}: {
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
        setActive(true);
      }
    } catch (err) {
      setReady(false);
      setActive(false);
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
  }, [onCapture]);

  return (
    <div className="grid gap-3">
      <div className="aspect-video overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-blue-50/60 to-green-50/40 shadow-md flex items-center justify-center relative">
        <video
          ref={videoRef}
          className="h-full w-full object-cover transition-all duration-200"
          playsInline
          muted
          aria-label="Webcam preview"
        />
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Camera className="size-10 text-blue-400 opacity-60" />
            <span className="text-base text-blue-700/70 font-semibold">
              Webcam Preview
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <Button
          variant="secondary"
          onClick={start}
          disabled={disabled || active}
          className="rounded-full px-6"
        >
          {active ? "Camera Active" : "Start Camera"}
        </Button>
        <Button
          variant="secondary"
          onClick={stop}
          disabled={!active || disabled}
          className="rounded-full px-6"
        >
          Stop
        </Button>
        <Button
          onClick={capture}
          disabled={!ready || disabled}
          className="rounded-full px-6"
        >
          Capture
        </Button>
      </div>
    </div>
  );
}

// Prediction Result Component
function PredictionResult({ result }: { result: UnifiedResponse }) {
  const top = result.top;
  const topPretty = pretty(top.label);
  const recycleStatus =
    top.label === "recyclable"
      ? "Recyclable"
      : top.label === "non-recyclable"
      ? "Non Recyclable"
      : MATERIAL_RECYCLE[top.label] ?? "Recyclable";

  const others = result.scores.filter((s) => s.label !== top.label).slice(0, 5);

  return (
    <div className="grid gap-4" aria-live="polite">
      <div className="rounded-xl border p-4 md:p-5 shadow-sm bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Top prediction
            </div>
            <div className="text-2xl font-semibold leading-tight">
              {topPretty}{" "}
              <span className="text-base font-normal text-muted-foreground">
                · {Math.round(top.confidence * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              {recycleStatus === "Recyclable" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-primary-foreground text-xs">
                  <Recycle className="size-4" aria-hidden="true" />
                  Recyclable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-destructive text-xs">
                  <ShieldAlert className="size-4" aria-hidden="true" />
                  Non Recyclable
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                Unified model · 8 classes
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Other possible matches
            </div>
            <div className="flex flex-wrap gap-2">
              {others.map((o) => (
                <span
                  key={o.label}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
                  title={`${pretty(o.label)} ${Math.round(
                    o.confidence * 100
                  )}%`}
                >
                  <span className="capitalize">{pretty(o.label)}</span>
                  <span className="text-muted-foreground">
                    · {Math.round(o.confidence * 100)}%
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Tip</div>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-pretty">
              {result.tip}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4 md:p-5">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Categories
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((c) => {
            const active = c === top.label;
            return (
              <span
                key={c}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm border",
                  active ? "bg-primary text-primary-foreground" : "bg-card"
                )}
              >
                <span className="capitalize">{pretty(c)}</span>
              </span>
            );
          })}
        </div>
      </div>

      <FindRecycling material={top.label} />
    </div>
  );
}

// Recent History Component
type HistoryItem = {
  id: string;
  image: string;
  result: UnifiedResponse;
  at: number;
};
function HistoryList({
  items,
  onSelect,
}: {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium">Recent</h3>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {items.map((h) => (
          <button
            key={h.id}
            onClick={() => onSelect(h)}
            className="group overflow-hidden rounded-md border focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Open previous classification"
          >
            <img
              src={h.image || "/placeholder.svg"}
              alt="Previous classification"
              className="h-20 w-full object-cover transition group-hover:opacity-90"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

const MATERIAL_RECYCLE: Record<string, "Recyclable" | "Non Recyclable"> = {
  cardboard: "Recyclable",
  glass: "Recyclable",
  metal: "Recyclable",
  paper: "Recyclable",
  plastic: "Recyclable",
  trash: "Non Recyclable",
};
const pretty = (l: string) =>
  l === "non-recyclable"
    ? "Non Recyclable"
    : l.charAt(0).toUpperCase() + l.slice(1);

export default function HomePage() {
  const { toast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedResponse | null>(null);
  const [history, setHistory] = useState<
    Array<{ id: string; image: string; result: UnifiedResponse; at: number }>
  >([]);

  const hasImage = !!image;
  const classifyDisabled = !hasImage || loading;

  const reset = useCallback(() => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }, []);

  const onImageSelected = useCallback((dataUrl: string) => {
    setImage(dataUrl);
    setPreview(dataUrl);
    setResult(null);
    setError(null);
  }, []);

  const classify = useCallback(async () => {
    if (!image) {
      setError("Please capture or upload an image first.");
      toast({
        title: "No image selected",
        description: "Capture from webcam or upload a file.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      if (!res.ok) throw new Error("Prediction failed");
      const data: UnifiedResponse = await res.json();
      setResult(data);
      setHistory((prev) => {
        const next = {
          id: `${Date.now()}`,
          image,
          result: data,
          at: Date.now(),
        };
        return [next, ...prev].slice(0, 8);
      });
    } catch {
      setError("Failed to classify image.");
      toast({
        title: "Classification failed",
        description: "Please try again with a different image.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [image, toast]);

  const headerKicker = useMemo(() => "Smart Waste Sorting", []);
  const headerTitle = useMemo(() => "Garbage Classifier", []);

  return (
    <main
      className="relative flex flex-col min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white overflow-x-hidden"
      style={{ minHeight: "100vh" }}
    >
      {/* Decorative eco background with glassmorphism overlays */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, #a7ffeb33 0, transparent 70%), radial-gradient(circle at 20% 80%, #b388ff33 0, transparent 70%)",
          zIndex: 0,
        }}
      />
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-green-200/60 via-blue-200/40 to-transparent blur-2xl opacity-70 z-0" />
      <SiteHeader />
      <section className="container mx-auto px-4 py-12 md:py-20 pb-32 flex-1 relative z-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center flex flex-col items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-400/80 to-blue-400/80 text-white text-xs font-semibold shadow-lg animate-fade-in">
              <Recycle className="size-4 text-white/90" />
              {headerKicker}
            </div>
            <h1 className="text-balance text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-green-600 via-blue-600 to-green-400 bg-clip-text text-transparent drop-shadow-xl animate-fade-in-up leading-tight md:leading-[1.1] pb-2">
              {" "}
              {headerTitle}
            </h1>
            <p className="mt-3 text-lg md:text-xl text-muted-foreground font-medium max-w-2xl animate-fade-in-up">
              Classify waste into 8 unified categories:{" "}
              <span className="font-bold text-green-700">cardboard</span>,{" "}
              <span className="font-bold text-blue-700">glass</span>,{" "}
              <span className="font-bold text-gray-700">metal</span>,{" "}
              <span className="font-bold text-yellow-700">paper</span>,{" "}
              <span className="font-bold text-cyan-700">plastic</span>,{" "}
              <span className="font-bold text-gray-500">trash</span>,{" "}
              <span className="text-green-700 font-bold">Recyclable</span>, and{" "}
              <span className="text-red-600 font-bold">Non Recyclable</span>.
            </p>
          </div>

          <Card className="p-0 md:p-0 animate-fade-in-up max-w-full">
            <CardHeader className="pb-1 pt-2 px-4 md:px-6">
              <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                    <Recycle className="text-green-600" />
                    Input
                  </CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    Use your webcam, drag & drop, or upload an image
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 md:gap-6 items-start px-4 md:px-6 pb-4">
              <div className="grid gap-3 md:gap-4">
                <div className="flex flex-col gap-3">
                  <ImageUploader
                    onSelect={onImageSelected}
                    disabled={loading}
                  />
                  <WebcamCapture
                    onCapture={onImageSelected}
                    disabled={loading}
                  />
                </div>
                <Separator />
              </div>

              <div className="grid gap-2 md:gap-3">
                <Label className="text-base md:text-lg font-semibold">
                  Preview
                </Label>
                <div
                  className={cn(
                    "aspect-video overflow-hidden rounded-2xl border border-primary/12 bg-muted shadow-sm transition-all backdrop-blur-md flex items-center justify-center",
                    !preview && "grid place-items-center"
                  )}
                >
                  {preview ? (
                    <img
                      src={preview || "/placeholder.svg"}
                      alt="Selected preview"
                      className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
                    />
                  ) : (
                    <div className="text-base text-muted-foreground">
                      No image selected
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <Button
                    onClick={classify}
                    disabled={classifyDisabled}
                    aria-busy={loading}
                    className="bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold shadow-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 px-6 py-2 rounded-full text-base"
                  >
                    {loading ? "Classifying…" : "Classify"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={reset}
                    disabled={loading && !result}
                    className="rounded-full px-4 py-2 text-sm"
                  >
                    Reset
                  </Button>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="text-base text-destructive font-medium mt-1 animate-fade-in"
                  >
                    {error}
                  </div>
                )}

                {result && (
                  <div className="rounded-2xl border border-primary/20 bg-white/90 p-3 shadow-md mt-1 animate-fade-in-up">
                    <PredictionResult result={result} />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3 md:gap-4 mt-2 px-4 md:px-6 pb-4">
              <div className="rounded-2xl bg-white/80 p-2 shadow-inner">
                <HistoryList
                  items={history}
                  onSelect={(h) => {
                    setImage(h.image);
                    setPreview(h.image);
                    setResult(h.result);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="text-sm">
                  Need details? See{" "}
                  <Link
                    className="underline underline-offset-4 font-semibold text-primary"
                    href="/how-it-works"
                  >
                    How it Works
                  </Link>
                  .
                </span>
                <span className="font-semibold text-sm">
                  Model: Unified (8 classes)
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
