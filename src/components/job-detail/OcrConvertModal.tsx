"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getJobImageUrl } from "@/lib/jobImageUrl";
import { assets } from "@/lib/assets";
import type { JobImage } from "@/lib/types";
import { AssetImage } from "@/components/ui/AssetImage";
import { Spinner } from "@/components/ui/Spinner";
import type { PendingImage } from "./OriginalTab";

export type OcrTarget = "raw_text" | "memo";

interface OcrConvertModalProps {
  savedImages: JobImage[];
  pendingImages: PendingImage[];
  onClose: () => void;
  onConverted: (text: string, target: OcrTarget) => void;
}

interface Selectable {
  key: string;
  previewUrl: string;
  /** 저장된 이미지는 URL에서 바이트를 받아오고, 첨부 예정 이미지는 File을 그대로 쓴다. */
  file?: File;
}

export function OcrConvertModal({
  savedImages,
  pendingImages,
  onClose,
  onConverted,
}: OcrConvertModalProps) {
  const items: Selectable[] = [
    ...savedImages.map((img) => ({
      key: img.id,
      previewUrl: getJobImageUrl(img.storage_path),
    })),
    ...pendingImages.map((img) => ({
      key: img.id,
      previewUrl: img.previewUrl,
      file: img.file,
    })),
  ];

  const [selected, setSelected] = useState<string[]>(items.map((i) => i.key));
  const [target, setTarget] = useState<OcrTarget>("raw_text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function toBlob(item: Selectable): Promise<Blob> {
    if (item.file) return item.file;
    // 저장된 이미지는 서버에만 있으므로 바이트를 다시 받아온다.
    // getJobImageUrl은 로컬에서 data URL, 운영에서 public storage URL을 돌려준다.
    const res = await fetch(item.previewUrl);
    return res.blob();
  }

  async function handleConvert() {
    if (loading || selected.length === 0) return;
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      for (const item of items) {
        if (!selected.includes(item.key)) continue;
        const blob = await toBlob(item);
        formData.append("file", blob, item.file?.name ?? `${item.key}.png`);
      }

      const result = await apiFetch<{ text: string }>("/jobs/ocr", {
        method: "POST",
        body: formData,
      });

      onConverted(result.text, target);
      onClose();
    } catch (err) {
      console.error("ocr convert failed:", err);
      setError(
        err instanceof ApiError
          ? err.message
          : "이미지를 변환하지 못했어요. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="font-pretendard relative z-10 flex w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ maxHeight: "90dvh" }}
      >
        <div className="flex h-[41px] shrink-0 items-center justify-between bg-dd-black px-5">
          <span className="text-sm font-medium text-white">
            이미지 텍스트 변환
          </span>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm font-semibold tracking-[-0.154px] text-dd-black">
            변환할 이미지를 선택하세요
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            {items.map((item) => {
              const checked = selected.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggle(item.key)}
                  className={`relative size-[96px] overflow-hidden rounded-lg border-2 ${
                    checked ? "border-dd-primary-green" : "border-dd-gray-400"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                  <span
                    className={`absolute right-1 top-1 flex size-5 items-center justify-center rounded-full text-xs text-white ${
                      checked ? "bg-dd-primary-green" : "bg-dd-gray-500"
                    }`}
                  >
                    {checked ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-sm font-semibold tracking-[-0.154px] text-dd-black">
            변환한 텍스트를 어디에 추가할까요?
          </p>
          <div className="mt-2 flex gap-5">
            {(
              [
                ["raw_text", "원문"],
                ["memo", "메모"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm text-dd-black"
              >
                <input
                  type="radio"
                  name="ocr-target"
                  checked={target === value}
                  onChange={() => setTarget(value)}
                  className="size-4 accent-dd-black"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs tracking-[-0.132px] text-dd-gray-500">
            기존에 입력된 내용은 지워지지 않고 뒤에 이어 붙습니다.
          </p>

          {error && (
            <p className="mt-3 text-xs tracking-[-0.132px] text-dd-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-dd-gray-500 bg-white px-5 py-2 text-sm font-semibold text-dd-black"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={selected.length === 0 || loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-dd-primary-green px-5 py-2 text-sm font-semibold text-white disabled:bg-dd-gray-500"
          >
            {loading ? (
              <>
                변환 중
                <Spinner className="size-3" />
              </>
            ) : (
              "변환하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
