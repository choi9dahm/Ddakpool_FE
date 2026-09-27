"use client";

import { useState } from "react";
import { AssetImage } from "./AssetImage";
import { assets } from "@/lib/assets";
import { FOLDER_SLOT_COLORS } from "@/lib/constants";
import type { Folder } from "@/lib/types";

interface FolderPickerProps {
  folders: Folder[];
  value: string | null;
  onChange: (folderId: string | null) => void;
  placeholder?: string;
  wrapperClassName?: string;
}

/** 폴더(저장 목적) pill 드롭다운. JobDetailModal / ManualAddModal 공용. */
export function FolderPicker({
  folders,
  value,
  onChange,
  placeholder = "저장 목적을 선택하세요",
  wrapperClassName = "relative shrink-0",
}: FolderPickerProps) {
  const [open, setOpen] = useState(false);
  const folder = folders.find((f) => f.id === value);
  const color = folder
    ? (FOLDER_SLOT_COLORS[folder.slot] ?? FOLDER_SLOT_COLORS[1])
    : null;

  return (
    <div className={wrapperClassName}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[10px] font-semibold tracking-[-0.11px] text-white md:px-[21px] md:text-base md:tracking-[-0.176px]"
        style={{ backgroundColor: color?.bg ?? "#19B469" }}
      >
        {folder?.name ?? placeholder}
        <AssetImage
          src={assets.iconDetailChevron}
          alt=""
          width={9}
          height={5}
          placeholderClassName="bg-transparent"
        />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-dd-gray-400 bg-white shadow-lg">
          {folders.map((f) => {
            const c = FOLDER_SLOT_COLORS[f.slot] ?? FOLDER_SLOT_COLORS[1];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange(f.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-dd-gray-100"
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.bg }}
                />
                {f.name}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="block w-full border-t border-dd-gray-200 px-4 py-2.5 text-left text-sm text-dd-gray-500 hover:bg-dd-gray-100"
          >
            미분류
          </button>
        </div>
      )}
    </div>
  );
}
