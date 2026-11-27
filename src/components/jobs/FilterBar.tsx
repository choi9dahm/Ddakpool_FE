"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetImage } from "@/components/ui/AssetImage";
import { assets } from "@/lib/assets";
import { SORT_OPTIONS } from "@/lib/constants";
import {
  isChoseongQuery,
  isPrefixChoseongMatch,
  matchesChoseong,
} from "@/lib/choseong";
import { koThenEnCompare } from "@/lib/keywords";

interface FilterBarProps {
  allKeywords: string[];
  selectedKeywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
  excludeExpired: boolean;
  onExcludeExpiredChange: (v: boolean) => void;
  sort: string;
  onSortChange: (sort: string) => void;
}

function rankKeyword(kw: string, query: string): number {
  const q = query.trim();
  if (!q) return 2;

  if (isChoseongQuery(q)) {
    if (isPrefixChoseongMatch(kw, q)) return 0;
    if (matchesChoseong(kw, q)) return 1;
    return 99;
  }

  const lower = kw.toLowerCase();
  const qLower = q.toLowerCase();
  if (lower.startsWith(qLower)) return 0;
  if (lower.includes(qLower)) return 1;
  return 99;
}

export function FilterBar({
  allKeywords,
  selectedKeywords,
  onKeywordsChange,
  excludeExpired,
  onExcludeExpiredChange,
  sort,
  onSortChange,
}: FilterBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingKeywords, setPendingKeywords] = useState<string[]>(selectedKeywords);
  const [sortOpen, setSortOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setPendingKeywords(selectedKeywords);
  }, [selectedKeywords]);

  function toggleKeyword(kw: string) {
    setPendingKeywords((prev) =>
      prev.includes(kw) ? prev.filter((k) => k !== kw) : [...prev, kw]
    );
  }

  function applyKeywords() {
    onKeywordsChange(pendingKeywords);
    setDropdownOpen(false);
    setSearch("");
  }

  const filtered = useMemo(() => {
    const q = search.trim();
    const candidates = q
      ? allKeywords.filter((kw) => rankKeyword(kw, q) < 99)
      : [...allKeywords];

    return candidates.sort((a, b) => {
      const ra = rankKeyword(a, q);
      const rb = rankKeyword(b, q);
      if (ra !== rb) return ra - rb;
      return koThenEnCompare(a, b);
    });
  }, [allKeywords, search]);

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "저장일 내림차순";

  return (
    <div className="flex h-[60px] shrink-0 items-center justify-between gap-3 bg-dd-gray-100 px-4 md:gap-0 md:px-8 lg:px-20">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setPendingKeywords(selectedKeywords);
              setSearch("");
              setDropdownOpen(!dropdownOpen);
            }}
            className="font-pretendard flex h-[30px] items-center gap-1.5 rounded-2xl bg-dd-black px-3 text-xs font-medium text-dd-yellow"
          >
            역량키워드
            <AssetImage
              src={assets.iconChevronDownYellow}
              alt=""
              width={9}
              height={5}
              placeholderClassName="bg-transparent"
            />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-2 flex w-[calc(100vw-2rem)] max-w-[524px] flex-col overflow-hidden rounded-[15px] border border-dd-gray-200 bg-white shadow-lg">
                <div className="flex h-[58px] shrink-0 items-center justify-center px-[10.5px] py-2">
                  <div className="flex h-10 w-full max-w-[503px] items-center gap-2.5 overflow-hidden rounded-full bg-[#F1F1F1] pl-5">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                      placeholder="찾으시는 역량키워드를 검색하세요"
                      className="font-pretendard min-w-0 flex-1 bg-transparent text-xs font-medium tracking-[-0.11px] text-dd-black outline-none placeholder:text-[#6B6B75]"
                    />
                    <button
                      type="button"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-dd-black"
                      aria-label="검색"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={assets.iconSearch}
                        alt=""
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                </div>

                <div className="h-[140px] shrink-0 overflow-y-auto px-3 py-2">
                  {filtered.length === 0 ? (
                    <p className="px-1 text-sm text-dd-gray-500">
                      일치하는 키워드가 없어요.
                    </p>
                  ) : (
                    <div className="flex flex-wrap content-start gap-1">
                      {filtered.map((kw) => {
                        const selected = pendingKeywords.includes(kw);
                        return (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => toggleKeyword(kw)}
                            className={`font-pretendard rounded-full border-[0.5px] border-dd-black px-1.5 py-1.5 text-xs leading-normal tracking-[-0.11px] ${
                              selected
                                ? "bg-dd-black font-medium text-white"
                                : "bg-white font-semibold text-dd-black"
                            }`}
                          >
                            {kw}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex h-[41px] shrink-0 items-center justify-end p-2">
                  <button
                    type="button"
                    onClick={applyKeywords}
                    className="font-pretendard rounded-[15px] bg-dd-primary-green px-5 py-1.5 text-xs font-semibold text-white"
                  >
                    적용하기
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedKeywords.length > 0 && (
          <div className="flex min-w-0 gap-2 overflow-x-auto">
            {selectedKeywords.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() =>
                  onKeywordsChange(selectedKeywords.filter((k) => k !== kw))
                }
                className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-dd-black px-3 py-1 text-xs text-white"
              >
                {kw}
                <AssetImage
                  src={assets.iconClose}
                  alt=""
                  width={11}
                  height={11}
                  className="invert"
                  placeholderClassName="bg-transparent"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3 md:gap-6">
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-dd-black md:gap-2 md:text-sm">
          <input
            type="checkbox"
            checked={excludeExpired}
            onChange={(e) => onExcludeExpiredChange(e.target.checked)}
            className="size-3.5 accent-dd-black"
          />
          마감제외
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs text-dd-black md:gap-2 md:text-sm"
          >
            <AssetImage
              src={assets.iconSortCaret}
              alt=""
              width={10}
              height={6}
              className="shrink-0"
              placeholderClassName="bg-transparent"
            />
            {sortLabel}
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSortOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded border border-dd-gray-400 bg-white py-1 shadow-lg">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onSortChange(opt.value);
                      setSortOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm hover:bg-dd-gray-100 ${
                      sort === opt.value ? "font-medium" : ""
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
