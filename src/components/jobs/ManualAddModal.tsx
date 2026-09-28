"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { Folder } from "@/lib/types";
import { AssetImage } from "../ui/AssetImage";
import { FolderSubmitButton } from "../ui/FolderSubmitButton";
import { FolderEditModal } from "../folders/FolderEditModal";
import { assets } from "@/lib/assets";
import { validateUrlFormat } from "@/lib/validators";

interface ManualAddModalProps {
  onClose: () => void;
  onSubmit: (
    rawText: string,
    folderId: string | null,
    sourceUrl: string | null
  ) => void;
  loading?: boolean;
}

export function ManualAddModal({
  onClose,
  onSubmit,
  loading,
}: ManualAddModalProps) {
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiFetch<Folder[]>("/folders"),
  });

  // 링크는 선택 입력이라 비어 있으면 그대로 통과시킨다.
  // 형식이 틀렸을 때만 막고 드롭다운을 열지 않는다 (HeaderArea와 같은 패턴).
  function handleAddClick() {
    if (!sourceUrl.trim()) {
      setUrlError("");
      setDropdownOpen(true);
      return;
    }
    const result = validateUrlFormat(sourceUrl);
    if (!result.valid) {
      setUrlError(result.message ?? "올바른 URL 형식이 아니에요.");
      return;
    }
    setUrlError("");
    setDropdownOpen(true);
  }

  function handleSelect(folderId: string | null) {
    const normalized = sourceUrl.trim()
      ? (validateUrlFormat(sourceUrl).normalized ?? null)
      : null;
    onSubmit(rawText.trim(), folderId, normalized);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="font-pretendard relative z-10 flex w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ maxHeight: "90dvh" }}
      >
        <div className="flex h-[41px] shrink-0 items-center justify-end bg-dd-black px-5">
          <button
            type="button"
            onClick={onClose}
            className="flex size-[23px] items-center justify-center"
            aria-label="닫기"
          >
            <AssetImage
              src={assets.iconDetailClose}
              alt=""
              width={23}
              height={23}
              placeholderClassName="bg-transparent"
            />
          </button>
        </div>

        <div className="px-6 pb-2 pt-5">
          <h2 className="text-lg font-semibold tracking-[-0.176px] text-dd-black">
            지원하지 않는 플랫폼의 채용공고를 직접 불러올 수 있어요
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="채용공고를 복사해서 붙여넣으세요"
            className="h-full min-h-[220px] w-full resize-y bg-white px-3 py-2 text-sm leading-[1.5] tracking-[-0.154px] text-dd-black outline-none placeholder:text-dd-gray-500"
          />
        </div>

        <div className="shrink-0 px-6">
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setUrlError("");
            }}
            placeholder="원문 공고 링크 (선택)"
            className="w-full bg-white px-3 py-2 text-sm leading-[1.5] tracking-[-0.154px] text-dd-black outline-none placeholder:text-dd-gray-500"
          />
          {urlError && (
            <p className="px-3 text-xs tracking-[-0.132px] text-dd-error">
              {urlError}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 px-6 pb-6 pt-2">
          <FolderSubmitButton
            label="추가하기"
            folders={folders}
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            onButtonClick={handleAddClick}
            onSelect={handleSelect}
            onEditFolders={() => setFolderModalOpen(true)}
            disabled={!rawText.trim() || loading}
            direction="up"
          />
        </div>
      </div>

      <FolderEditModal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
      />
    </div>
  );
}
