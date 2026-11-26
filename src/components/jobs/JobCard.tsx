"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDdayLabel } from "@/lib/dday";
import { FOLDER_SLOT_COLORS } from "@/lib/constants";
import {
  keywordsForCardDisplay,
} from "@/lib/keywords";
import { apiFetch } from "@/lib/api-client";
import { assets } from "@/lib/assets";
import type { Folder, JobPosting } from "@/lib/types";
import { AssetImage } from "@/components/ui/AssetImage";
import { captureEvent } from "@/lib/analytics";

interface JobCardProps {
  job: JobPosting;
  onOpen: (job: JobPosting) => void;
  onDelete: (job: JobPosting) => void;
  selectedKeywords?: string[];
}

export function JobCard({
  job,
  onOpen,
  onDelete,
  selectedKeywords = [],
}: JobCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dday = getDdayLabel(job.deadline_date, job.deadline_status);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiFetch<Folder[]>("/folders"),
  });

  const folder = folders.find((f) => f.id === job.folder_id);
  const folderColor = folder
    ? FOLDER_SLOT_COLORS[folder.slot] ?? FOLDER_SLOT_COLORS[1]
    : null;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const selectedSet = new Set(selectedKeywords);
  const keywords = keywordsForCardDisplay(
    job.competency_keywords ?? [],
    selectedKeywords
  );

  function handleOpen() {
    captureEvent("card_clicked", { job_id: job.id });
    onOpen(job);
  }

  return (
    <div
      className="font-pretendard relative flex min-h-[192px] w-full cursor-pointer flex-col rounded-2xl border border-dd-gray-400 bg-white p-3 shadow-sm transition hover:shadow-md sm:h-[192px] sm:w-[252px] sm:p-4"
      onClick={handleOpen}
    >
      <div ref={menuRef} className="flex shrink-0 items-start justify-between">
        <p className="line-clamp-1 pr-2 text-[10px] leading-none text-dd-gray-500">
          {job.company_name || "기업 이름"}
        </p>
        <button
          type="button"
          className="shrink-0 text-dd-gray-500 hover:text-dd-black"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          aria-label="더보기"
        >
          <AssetImage
            src={assets.iconMoreHoriz}
            alt=""
            width={20}
            height={20}
            placeholderClassName="bg-transparent"
          />
        </button>

        {menuOpen && (
          <div
            className="absolute right-4 top-10 z-10 rounded-lg border border-dd-gray-400 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="block w-full px-4 py-2 text-left text-sm text-dd-error hover:bg-dd-gray-100"
              onClick={() => {
                setMenuOpen(false);
                onDelete(job);
              }}
            >
              삭제
            </button>
          </div>
        )}
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-dd-black sm:line-clamp-1 sm:text-base">
        {job.recruitment_field || job.job_title || "모집 분야"}
      </h3>

      <p className="mt-3 text-xs font-semibold leading-none text-dd-black">
        핵심역량
      </p>

      <div className="mt-1.5 flex h-11 shrink-0 flex-wrap content-start gap-1 overflow-hidden">
        {keywords.length === 0 ? (
          <span className="text-[10px] text-dd-gray-500">키워드 없음</span>
        ) : (
          keywords.map((kw) => {
            const isSelected = selectedSet.has(kw);
            return (
              <span
                key={kw}
                className={`inline-flex h-5 max-w-full shrink-0 items-center rounded-full border px-2 text-[10px] leading-none ${
                  isSelected
                    ? "border-dd-black bg-dd-black font-medium text-white"
                    : "border-dd-gray-400 bg-white text-dd-black"
                }`}
              >
                <span className="truncate">{kw}</span>
              </span>
            );
          })
        )}
      </div>

      <div className="min-h-2 flex-1" aria-hidden />

      <div className="mt-2 flex shrink-0 items-end justify-between">
        {folder && folderColor ? (
          <span
            className="inline-flex h-5 items-center rounded-full px-2.5 text-[10px] font-semibold leading-none"
            style={{ backgroundColor: folderColor.bg, color: folderColor.text }}
          >
            {folder.name}
          </span>
        ) : (
          <span />
        )}
        {dday.label && (
          <span
            className={`text-sm font-bold leading-none ${
              dday.expired
                ? "text-dd-gray-500"
                : dday.urgent
                  ? "text-dd-error"
                  : "text-dd-black"
            }`}
          >
            {dday.label}
          </span>
        )}
      </div>
    </div>
  );
}
