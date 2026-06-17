"use client";

import { syncInacoV2FromSearchParams } from "@/lib/inaco/model-version";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function InacoModelVersionSyncInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    syncInacoV2FromSearchParams(searchParams);
  }, [searchParams]);

  return null;
}

export function InacoModelVersionSync() {
  return (
    <Suspense fallback={null}>
      <InacoModelVersionSyncInner />
    </Suspense>
  );
}
