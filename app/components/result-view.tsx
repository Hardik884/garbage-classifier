"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "./category-badge";
import { FindRecycling } from "./find-recycling";
import type { ClassificationResult } from "@/lib/classifier";
import { Recycle, ShieldAlert } from "lucide-react";

export function ResultView({
  result,
  imageSrc,
}: {
  result: ClassificationResult;
  imageSrc: string;
}) {
  const { top, predictions, recyclable, tip } = result;
  const others = predictions.slice(1, 5);

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-balance text-2xl">
              Top prediction: <span className="capitalize">{top.label}</span>
            </CardTitle>
            <div className="mt-2 flex items-center gap-2">
              {recyclable === "Recyclable" ? (
                <Badge
                  className="gap-1"
                  variant="default"
                  aria-label="Recyclable"
                >
                  <Recycle className="size-4" />
                  Recyclable
                </Badge>
              ) : (
                <Badge
                  className="gap-1"
                  variant="destructive"
                  aria-label="Non Recyclable"
                >
                  <ShieldAlert className="size-4" />
                  Non Recyclable
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">Confidence</span>
              <span className="text-lg font-semibold">
                {Math.round(top.confidence * 100)}%
              </span>
            </div>
          </div>
          <div className="relative aspect-video w-48 overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                imageSrc ||
                "/placeholder.svg?height=270&width=480&query=classified image preview"
              }
              alt="Classified preview"
              className="h-full w-full object-cover"
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Other possible matches
            </h3>
            <div className="flex flex-wrap gap-2">
              {others.map((p) => (
                <CategoryBadge
                  key={p.label}
                  label={p.label}
                  muted
                  percent={p.confidence}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">Tip</h3>
            <div className="rounded-lg border p-3 text-sm leading-relaxed text-pretty">
              {tip}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-balance text-xl">Categories</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {predictions.slice(0, 8).map((p) => (
            <CategoryBadge
              key={p.label}
              label={p.label}
              percent={p.confidence}
            />
          ))}
        </CardContent>
      </Card>

      <FindRecycling material={top.label} />
    </div>
  );
}
