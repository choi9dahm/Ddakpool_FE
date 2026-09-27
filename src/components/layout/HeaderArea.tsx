"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import posthog from "posthog-js";
import { FolderEditModal } from "@/components/folders/FolderEditModal";
import { AssetImage } from "@/components/ui/AssetImage";
import { FolderSubmitButton } from "@/components/ui/FolderSubmitButton";
import { apiFetch, ApiError } from "@/lib/api-client";
import { assets } from "@/lib/assets";
import { validateJobUrl } from "@/lib/validators";
import type { Folder, Profile } from "@/lib/types";

interface HeaderAreaProps {
  onSubmit?: (url: string, folderId: string | null) => Promise<void>;
  loading?: boolean;
  compact?: boolean;
}

export function HeaderArea({ onSubmit, loading, compact }: HeaderAreaProps) {
  const pathname = usePathname();
  const showUrlBar =
    pathname === "/all" ||
    pathname === "/" ||
    pathname.startsWith("/folders/");

  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<Profile>("/profile"),
  });

  useEffect(() => {
    if (posthog.__loaded && profile?.id) {
      posthog.identify(profile.id, {
        email: profile.email,
        nickname: profile.nickname,
      });
    }
  }, [profile]);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiFetch<Folder[]>("/folders"),
    enabled: showUrlBar,
  });

  function handleUrlSubmit() {
    const validation = validateJobUrl(url);
    if (!validation.valid) {
      setError(validation.message ?? "URL 형식 오류");
      return;
    }

    setError("");
    setDropdownOpen(true);
  }

  async function handleFolderSelect(folderId: string | null) {
    if (!onSubmit) return;
    try {
      await onSubmit(url.trim(), folderId);
      setUrl("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "duplicate_url") {
        // POP-10은 JobListPage에서 처리
        return;
      }
      if (err instanceof Error) setError(err.message);
    }
  }

  return (
    <header
      className={`relative shrink-0 bg-white px-5 ${
        compact
          ? "min-h-[216px] border-b border-dd-gray-200 pb-4 pt-[22px]"
          : showUrlBar
            ? "pb-6 pt-[22px]"
            : "pb-5 pt-[22px]"
      }`}
    >
      <div className={`flex ${compact || pathname === "/settings" ? "h-[21px]" : "justify-end"}`}>
        {!compact && pathname !== "/settings" && (
          <Link
            href="/settings"
            className="font-pretendard flex items-center gap-1 text-sm font-semibold text-dd-black hover:opacity-80"
          >
            <span>{profile?.nickname ?? "설정"}</span>
            <AssetImage
              src={assets.iconSettings}
              alt=""
              width={16}
              height={16}
              placeholderClassName="bg-transparent"
            />
          </Link>
        )}
      </div>

      <div
        className={`flex items-center justify-center gap-[15px] ${
          compact ? "mt-4" : "mt-[33px]"
        }`}
      >
        <Link href="/all" className="shrink-0" aria-label="딱풀 홈">
          <AssetImage
            src={assets.logoDdakpool}
            alt=""
            width={84}
            height={84}
            className="size-[84px]"
            placeholderClassName="size-[84px] rounded bg-dd-gray-200"
          />
        </Link>
        <Link href="/all" className="shrink-0" aria-label="딱풀 홈">
          <AssetImage
            src={assets.logoWordmark}
            alt="ddakpool"
            width={194}
            height={64}
            className="h-[61px] w-auto"
            placeholderClassName="h-[61px] w-[185px] rounded bg-dd-gray-200"
            priority
          />
        </Link>
      </div>

      {showUrlBar && onSubmit && (
        <div className="relative mx-auto mt-[22px] flex w-full max-w-[686px] flex-col items-center">
          <div className="flex h-[55px] w-full items-center rounded-[42px] bg-dd-input-bg pl-8">
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && !loading && url && handleUrlSubmit()
              }
              placeholder="https:// 채용공고 URL을 붙여넣으면 자동으로 정리돼요."
              className="font-pretendard min-w-0 flex-1 bg-transparent text-base tracking-[-0.176px] text-dd-black outline-none placeholder:text-dd-gray-500"
            />
            <FolderSubmitButton
              label="URL 추가"
              folders={folders}
              open={dropdownOpen}
              onOpenChange={setDropdownOpen}
              onButtonClick={handleUrlSubmit}
              onSelect={handleFolderSelect}
              onEditFolders={() => setFolderModalOpen(true)}
              disabled={!url.trim() || loading}
            />
          </div>

          {error && (
            <p className="font-pretendard mt-2 text-center text-sm text-dd-error">
              {error}
            </p>
          )}
        </div>
      )}

      <FolderEditModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
      />
    </header>
  );
}
