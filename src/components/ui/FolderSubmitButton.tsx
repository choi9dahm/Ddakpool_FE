"use client";

import { useEffect, useRef } from "react";
import { AssetImage } from "./AssetImage";
import { assets } from "@/lib/assets";
import { FOLDER_SLOT_COLORS } from "@/lib/constants";
import type { Folder } from "@/lib/types";

function FolderColorIcon({ color }: { color: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <path
        d="M3.33301 6.66699L3.33301 15.8337C3.33301 16.2939 3.7061 16.667 4.16634 16.667H15.833C16.2933 16.667 16.6663 16.2939 16.6663 15.8337V7.50033C16.6663 7.04009 16.2933 6.66699 15.833 6.66699H10.4163L8.74967 5.00033C8.56214 4.8128 8.30779 4.70744 8.04257 4.70744H4.16634C3.7061 4.70744 3.33301 5.08054 3.33301 5.54077V6.66699Z"
        fill={color}
      />
    </svg>
  );
}

interface FolderSubmitButtonProps {
  label: string;
  folders: Folder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 버튼 클릭. 부모가 검증 후 직접 onOpenChange(true)를 호출한다. */
  onButtonClick: () => void;
  /** null = "일단 저장하기"(미분류) */
  onSelect: (folderId: string | null) => void;
  onEditFolders: () => void;
  disabled?: boolean;
  direction?: "down" | "up";
}

/**
 * 초록 pill 버튼 + 폴더 드롭다운. 폴더를 고르는 행위가 곧 제출이다.
 * 헤더 'URL 추가'와 수동 추가 모달 '추가하기'가 공유한다.
 *
 * open을 controlled로 둔 이유: 헤더는 Enter 키로도 드롭다운을 열어야 해서
 * 컴포넌트가 open을 혼자 들고 있으면 그 경로가 막힌다.
 */
export function FolderSubmitButton({
  label,
  folders,
  open,
  onOpenChange,
  onButtonClick,
  onSelect,
  onEditFolders,
  disabled,
  direction = "down",
}: FolderSubmitButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  const itemClass =
    "font-pretendard flex h-9 w-full items-center gap-2.5 px-3.5 text-left text-sm text-dd-black hover:bg-dd-gray-100";

  const saveHere = (
    <button
      key="save-here"
      type="button"
      onClick={() => {
        onOpenChange(false);
        onSelect(null);
      }}
      className={itemClass}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assets.iconBookmark}
        alt=""
        width={20}
        height={20}
        className="shrink-0"
      />
      일단 저장하기
    </button>
  );

  const folderList = (
    <div key="folders">
      {folders.map((folder) => {
        const color = FOLDER_SLOT_COLORS[folder.slot] ?? FOLDER_SLOT_COLORS[1];
        return (
          <button
            key={folder.id}
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSelect(folder.id);
            }}
            className={itemClass}
          >
            <FolderColorIcon color={color.bg} />
            <span className="truncate">{folder.name}</span>
          </button>
        );
      })}
    </div>
  );

  const editFolders = (
    <button
      key="edit-folders"
      type="button"
      onClick={() => {
        onOpenChange(false);
        onEditFolders();
      }}
      className={itemClass}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assets.iconFilterAlt}
        alt=""
        width={20}
        height={20}
        className="shrink-0"
      />
      폴더 수정하기
    </button>
  );

  // 위로 펼칠 때는 버튼에 가까운 쪽이 주 액션이 되도록 순서를 뒤집는다.
  const sections = [saveHere, folderList, editFolders];
  if (direction === "up") sections.reverse();

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onButtonClick}
        disabled={disabled}
        className="font-pretendard flex h-[55px] shrink-0 items-center justify-center gap-[4px] rounded-[30px] bg-dd-primary-green px-4 text-base font-bold tracking-[-0.176px] text-white disabled:opacity-50"
      >
        {label}
        <AssetImage
          src={assets.iconChevronDownWhite}
          alt=""
          width={24}
          height={24}
          placeholderClassName="bg-transparent"
        />
      </button>

      {open && (
        <div
          className={`absolute right-0 z-30 w-[167px] overflow-hidden rounded-2xl bg-white py-1 shadow-[0_4px_20px_rgba(0,0,0,0.12)] ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {sections.map((section, i) => (
            <div key={section.key}>
              {i > 0 && <div className="mx-3 my-1 border-t border-dd-gray-200" />}
              {section}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
