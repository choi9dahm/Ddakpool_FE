"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AssetImage } from "@/components/ui/AssetImage";
import { apiFetch } from "@/lib/api-client";
import { assets } from "@/lib/assets";
import type { Folder } from "@/lib/types";
import { FolderEditModal } from "@/components/folders/FolderEditModal";

function isAllActive(pathname: string) {
  return pathname === "/all" || pathname === "/";
}

function isEtcActive(pathname: string) {
  return pathname === "/folders/etc";
}

function isFolderActive(pathname: string, folderId: string) {
  return pathname === `/folders/${folderId}`;
}

function tabClass(active: boolean) {
  // GNB-01: 활성 언더라인 3px #18181B SemiBold / 비활성 Medium #18181B
  return `flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-2.5 py-3 text-xs transition md:gap-2 md:px-4 md:text-sm ${
    active
      ? "border-dd-black font-semibold text-dd-black"
      : "border-transparent font-medium text-dd-black hover:opacity-80"
  }`;
}

function TabIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <AssetImage
      src={src}
      alt={alt}
      width={20}
      height={20}
      className="shrink-0"
      placeholderClassName="size-5 bg-transparent"
    />
  );
}

export function TabGNB({
  onActiveTabReclick,
}: {
  onActiveTabReclick?: () => void;
} = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiFetch<Folder[]>("/folders"),
  });

  function handleNavClick(href: string, isActive: boolean) {
    if (isActive) {
      onActiveTabReclick?.();
      router.refresh();
    } else {
      router.push(href);
    }
  }

  return (
    <>
      <nav className="flex h-[53px] shrink-0 items-center justify-between gap-2 border-b border-dd-gray-400 bg-white px-4 md:px-8 lg:px-20">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleNavClick("/all", isAllActive(pathname))}
            className={tabClass(isAllActive(pathname))}
          >
            <TabIcon src={assets.iconTabGrid} alt="" />
            전체보기
          </button>

          {folders.map((folder) => {
            const active = isFolderActive(pathname, folder.id);
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() =>
                  handleNavClick(`/folders/${folder.id}`, active)
                }
                className={tabClass(active)}
              >
                <TabIcon
                  src={
                    active ? assets.iconTabFolderOpen : assets.iconTabFolder
                  }
                  alt=""
                />
                {folder.name}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              handleNavClick("/folders/etc", isEtcActive(pathname))
            }
            className={tabClass(isEtcActive(pathname))}
          >
            <TabIcon
              src={
                isEtcActive(pathname)
                  ? assets.iconTabFolderOpen
                  : assets.iconTabFolder
              }
              alt=""
            />
            미분류
          </button>
        </div>

        <button
          type="button"
          onClick={() => setFolderModalOpen(true)}
          aria-label="폴더 수정하기"
          className="font-pretendard flex shrink-0 items-center gap-2.5 text-sm text-dd-gray-500 hover:text-dd-black"
        >
          <TabIcon src={assets.iconFilterAlt} alt="" />
          <span className="hidden md:inline">폴더 수정하기</span>
        </button>
      </nav>

      <FolderEditModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
      />
    </>
  );
}
