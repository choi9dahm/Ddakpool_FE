"use client";

import { Spinner } from "./Spinner";

interface SaveButtonProps {
  onClick: () => void;
  disabled?: boolean;
  saving?: boolean;
  label?: string;
  savingLabel?: string;
}

/** 상세페이지 '저장하기' 버튼. ManualAddModal의 '추가하기'도 동일 컴포넌트를 쓴다. */
export function SaveButton({
  onClick,
  disabled,
  saving,
  label = "저장하기",
  savingLabel = "저장중",
}: SaveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-dd-primary-green px-5 py-2 text-sm font-semibold tracking-[-0.154px] text-white disabled:bg-dd-gray-500"
    >
      {saving ? (
        <>
          {savingLabel}
          <Spinner className="size-3" />
        </>
      ) : (
        label
      )}
    </button>
  );
}
