"use client";

import { useEffect, useRef, useState } from "react";
import { getJobImageUrl } from "@/lib/jobImageUrl";
import { assets } from "@/lib/assets";
import type { JobImage, JobPosting } from "@/lib/types";
import { AssetImage } from "@/components/ui/AssetImage";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface PendingImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface OriginalTabProps {
  job: JobPosting;
  form: JobPosting;
  onChange: (updates: Partial<JobPosting>) => void;
  pendingImages: PendingImage[];
  deletedImageIds: string[];
  onPendingChange: (
    pending: PendingImage[],
    deletedIds: string[]
  ) => void;
  /** form에 저장하지 않은 변경사항이 있는지 — 있으면 OCR로 필드를 덮어쓰지 않도록 막는다 */
  dirty: boolean;
  /** OCR로 필드를 채운 최신 job을 부모(JobDetailModal)에 반영 */
  onOcrFilled: (job: JobPosting) => void;
}

export function OriginalTab({
  job,
  form,
  onChange,
  pendingImages,
  deletedImageIds,
  onPendingChange,
  dirty,
  onOcrFilled,
}: OriginalTabProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");

  const savedImages = (job.job_posting_images ?? []).filter(
    (img) => !deletedImageIds.includes(img.id)
  );
  const totalCount = savedImages.length + pendingImages.length;

  useEffect(() => {
    return () => {
      // revoke only handled by parent on discard; keep previews while mounted
    };
  }, []);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    let nextPending = [...pendingImages];
    let nextDeleted = [...deletedImageIds];
    let err = "";

    for (const file of list) {
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        err = "JPG, PNG 파일만 첨부할 수 있어요.";
        continue;
      }
      if (file.size > 4 * 1024 * 1024) {
        err = "4MB 이하의 파일만 첨부할 수 있어요.";
        continue;
      }
      const currentTotal =
        (job.job_posting_images ?? []).filter(
          (img) => !nextDeleted.includes(img.id)
        ).length + nextPending.length;
      if (currentTotal >= 5) {
        err = "이미지는 최대 5개까지 첨부할 수 있어요.";
        break;
      }
      nextPending.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setError(err);
    onPendingChange(nextPending, nextDeleted);
  }

  function removeSaved(img: JobImage) {
    onPendingChange(pendingImages, [...deletedImageIds, img.id]);
    setError("");
  }

  function removePending(id: string) {
    const target = pendingImages.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onPendingChange(
      pendingImages.filter((p) => p.id !== id),
      deletedImageIds
    );
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  async function handleOcrFill() {
    if (dirty || ocrLoading || savedImages.length === 0) return;
    setOcrLoading(true);
    setOcrError("");
    try {
      const updated = await apiFetch<JobPosting>(`/jobs/${job.id}/ocr-fill`, {
        method: "POST",
      });
      onOcrFilled(updated);
    } catch (err) {
      setOcrError(
        err instanceof ApiError && err.code === "no_ocr_text"
          ? "이미지에서 인식된 텍스트가 없어요."
          : "이미지에서 텍스트를 가져오지 못했어요. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setOcrLoading(false);
    }
  }

  const showRawFail = job.parsing_status === "fail" && !form.raw_text;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-1 border-b border-t border-dd-gray-400 bg-white px-[18px] py-4 md:flex-row md:items-center md:gap-4 md:px-9">
        <h3 className="shrink-0 text-xl font-semibold tracking-[-0.22px] text-dd-black">
          원문 & 이미지 첨부
        </h3>
        <p className="text-xs tracking-[-0.132px] text-dd-gray-500">
          URL에서 가져온 텍스트 원문과 캡처 이미지를 함께 보관합니다.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-[18px] overflow-y-auto overscroll-contain bg-dd-gray-100 px-[18px] py-[18px] md:px-9">
        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <AssetImage
              src={assets.iconDetailFileStar}
              alt=""
              width={16}
              height={16}
              placeholderClassName="bg-transparent"
            />
            <span className="text-sm font-semibold tracking-[-0.154px] text-dd-black">
              텍스트 원문
            </span>
            {showRawFail && (
              <span className="text-xs tracking-[-0.132px] text-dd-error">
                *공고 원문을 불러오지 못했어요. 직접 입력해 주세요.
              </span>
            )}
          </div>
          <textarea
            value={form.raw_text}
            onChange={(e) => onChange({ raw_text: e.target.value })}
            rows={8}
            placeholder="채용공고에서 파싱된 텍스트의 원문이 보여지는 공간입니다."
            className="w-full resize-y bg-white px-3 py-2 text-sm leading-[1.5] tracking-[-0.154px] text-dd-black outline-none placeholder:text-dd-gray-500"
          />
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <AssetImage
              src={assets.iconDetailFile}
              alt=""
              width={16}
              height={16}
              placeholderClassName="bg-transparent"
            />
            <span className="text-sm font-semibold tracking-[-0.154px] text-dd-black">
              이미지 첨부
            </span>
            {error && (
              <span className="text-xs tracking-[-0.132px] text-dd-error">
                *{error}
              </span>
            )}
          </div>

          {savedImages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOcrFill}
                disabled={dirty || ocrLoading}
                className="inline-flex items-center gap-2 rounded-full border border-dd-black bg-white px-4 py-1.5 text-xs font-semibold tracking-[-0.132px] text-dd-black disabled:border-dd-gray-400 disabled:text-dd-gray-500"
              >
                {ocrLoading ? (
                  <>
                    이미지 인식 중
                    <Spinner className="size-3" />
                  </>
                ) : (
                  "이미지에서 텍스트 채우기"
                )}
              </button>
              {dirty && (
                <span className="text-xs tracking-[-0.132px] text-dd-gray-500">
                  저장하지 않은 변경사항이 있어요. 먼저 저장해 주세요.
                </span>
              )}
              {ocrError && (
                <span className="text-xs tracking-[-0.132px] text-dd-error">
                  *{ocrError}
                </span>
              )}
            </div>
          )}

          {totalCount > 0 && (
            <div className="flex flex-wrap gap-5">
              {savedImages.map((img) => {
                const src = getJobImageUrl(img.storage_path);
                return (
                  <div key={img.id} className="relative size-[120px]">
                    <button
                      type="button"
                      onClick={() => src && setPreview(src)}
                      className="flex size-full items-center justify-center overflow-hidden bg-white"
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt="첨부 이미지"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-dd-gray-500">IMG</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSaved(img);
                      }}
                      className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-dd-error text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {pendingImages.map((img) => (
                <div key={img.id} className="relative size-[120px]">
                  <button
                    type="button"
                    onClick={() => setPreview(img.previewUrl)}
                    className="flex size-full items-center justify-center overflow-hidden bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt="첨부 예정 이미지"
                      className="size-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePending(img.id);
                    }}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-dd-error text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-stretch gap-3 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex items-center gap-2.5">
              <AssetImage
                src={assets.iconDetailUpload}
                alt=""
                width={32}
                height={32}
                placeholderClassName="bg-transparent"
              />
              <div>
                <p className="text-sm tracking-[-0.154px] text-dd-black">
                  캡처 이미지를 끌어다 놓으세요.
                </p>
                <p className="text-xs tracking-[-0.132px] text-dd-gray-500">
                  JPG, PNG · 파일당 최대 4MB, 이미지 최대 5장
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0 rounded-full bg-dd-black px-5 py-2 text-sm font-medium tracking-[-0.154px] text-white"
            >
              파일 선택
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </section>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-6 top-6 text-2xl text-white"
            onClick={() => setPreview(null)}
          >
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="이미지 미리보기"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
