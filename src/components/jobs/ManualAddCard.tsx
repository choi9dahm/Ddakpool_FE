"use client";

interface ManualAddCardProps {
  onClick: () => void;
}

/** 그리드 좌상단 고정 카드. JobCard와 동일 규격(252x192). */
export function ManualAddCard({ onClick }: ManualAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[192px] w-[252px] flex-col items-center justify-center gap-2 rounded-2xl border border-dd-gray-400 bg-white shadow-sm transition hover:shadow-md"
    >
      <span className="text-4xl font-light leading-none text-dd-gray-500">
        +
      </span>
      <span className="text-sm font-medium text-dd-gray-500">
        새로운 공고 추가
      </span>
    </button>
  );
}
