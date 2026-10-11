"use client";

import { assets } from "@/lib/assets";
import { layout } from "@/lib/design-tokens";
import { AssetImage } from "./AssetImage";

export type ModalVariant =
  | "error"
  | "success"
  | "loading"
  | "confirm-delete"
  | "confirm-leave"
  | "confirm-withdraw"
  | "parse-fail";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  variant?: ModalVariant;
  actions?: React.ReactNode;
  closeOnBackdrop?: boolean;
  width?: number;
}

function ModalIcon({ variant }: { variant: ModalVariant }) {
  if (variant === "loading") {
    return (
      <AssetImage
        src={assets.iconModalLoading}
        alt=""
        width={43}
        height={43}
        className="animate-spin"
        placeholderClassName="bg-transparent"
      />
    );
  }
  if (variant === "success") {
    return (
      <AssetImage
        src={assets.iconModalSuccess}
        alt=""
        width={38}
        height={38}
        placeholderClassName="bg-transparent"
      />
    );
  }
  return (
    <AssetImage
      src={assets.iconModalExclamation}
      alt=""
      width={38}
      height={38}
      placeholderClassName="bg-transparent"
    />
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  variant = "error",
  actions,
  closeOnBackdrop = false,
  width = layout.modalWidth,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className="font-pretendard relative z-10 flex w-full flex-col overflow-hidden rounded-2xl shadow-xl"
        style={{ width, maxWidth: width }}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex shrink-0 items-center justify-center rounded-t-2xl bg-dd-black text-base font-medium tracking-[-0.176px] text-white"
          style={{ height: layout.modalHeaderHeight }}
        >
          {title}
        </div>
        <div className="flex flex-col items-center justify-center gap-5 rounded-b-2xl border border-t-0 border-dd-gray-500 bg-white px-8 pb-8 pt-7">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <ModalIcon variant={variant} />
            <div className="text-base font-medium leading-[1.3] tracking-[-0.176px] text-dd-black">
              {children}
            </div>
          </div>
          {actions && (
            <div className="flex justify-center gap-5">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ModalButton({
  children,
  onClick,
  variant = "outline",
  disabled,
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "danger" | "outline";
  disabled?: boolean;
  // 긴 라벨(예: "로그인 없이 계속")이 줄바꿈되지 않도록 고정 94px 대신 내용에 맞춰 늘어남
  wide?: boolean;
}) {
  // Figma 팝업 버튼: 모두 outline (흰 배경 + 회색 테두리)
  // primary/danger도 동일 스타일로 맞춤
  const styles = {
    primary:
      "border border-dd-gray-500 bg-white text-dd-black",
    danger:
      "border border-dd-gray-500 bg-white text-dd-black",
    outline:
      "border border-dd-gray-500 bg-white text-dd-black",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[30px] shrink-0 items-center justify-center whitespace-nowrap rounded text-sm font-medium tracking-[-0.154px] disabled:opacity-50 ${
        wide ? "px-6" : "w-[94px] px-5"
      } ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
