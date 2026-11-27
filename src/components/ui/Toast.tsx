"use client";

import { useEffect } from "react";
import { assets } from "@/lib/assets";
import { AssetImage } from "./AssetImage";

interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  durationMs?: number;
}

export function Toast({
  message,
  open,
  onClose,
  durationMs = 3000,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 sm:bottom-8">
      <div className="font-pretendard flex h-12 items-center justify-center gap-1.5 rounded-[30px] bg-dd-black px-4 shadow-lg">
        <AssetImage
          src={assets.iconToastCheck}
          alt=""
          width={24}
          height={24}
          placeholderClassName="bg-transparent"
        />
        <p className="whitespace-nowrap text-base font-semibold leading-[1.2] tracking-[-0.22px] text-white sm:text-xl">
          {message}
        </p>
      </div>
    </div>
  );
}
