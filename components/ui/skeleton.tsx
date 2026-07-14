"use client";

import React from "react";
import clsx from "clsx";

type SkeletonProps = {
  className?: string;
  as?: "div" | "span";
};

export function Skeleton({ className, as: Component = "div" }: SkeletonProps) {
  return <Component aria-hidden="true" className={clsx("animate-pulse rounded-2xl bg-white/10", className)} />;
}
