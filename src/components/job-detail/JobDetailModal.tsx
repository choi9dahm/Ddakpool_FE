"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getDdayLabel } from "@/lib/dday";
import { deriveDeadlineStatus } from "@/lib/deadlineStatus";
import { FOLDER_SLOT_COLORS } from "@/lib/constants";
import { layout } from "@/lib/design-tokens";
import type { Folder, JobPosting, StructuredKeyword } from "@/lib/types";
import { InsightTab } from "./InsightTab";
import { OriginalTab, type PendingImage } from "./OriginalTab";
import { MemoTab } from "./MemoTab";
import { Modal, ModalButton } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { AssetImage } from "../ui/AssetImage";
import { assets } from "@/lib/assets";

interface JobDetailModalProps {
  job: JobPosting;
  onClose: () => void;
  onUpdated: (job: JobPosting) => void;
  onDeleted: () => void;
  /** 저장 완료 후 모달이 닫힌 뒤 부모에서 POP-04 토스트 표시 */
  onSaved?: () => void;
}

type Tab = "insight" | "original" | "memo";

const TABS: { id: Tab; label: string }[] = [
  { id: "insight", label: "요약" },
  { id: "original", label: "원문" },
  { id: "memo", label: "메모" },
];

function withDerivedDeadline(job: JobPosting): JobPosting {
  const deadline_status = deriveDeadlineStatus(
    job.deadline_raw,
    job.deadline_date,
    job.deadline_status
  );
  if (deadline_status === job.deadline_status) return job;
  return { ...job, deadline_status };
}

function discardPending(pending: PendingImage[]) {
  for (const p of pending) URL.revokeObjectURL(p.previewUrl);
}

export function JobDetailModal({
  job,
  onClose,
  onUpdated,
  onDeleted,
  onSaved,
}: JobDetailModalProps) {
  const [tab, setTab] = useState<Tab>("insight");
  const [form, setForm] = useState<JobPosting>(() => withDerivedDeadline(job));
  const [dirty, setDirty] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [currentJob, setCurrentJob] = useState(job);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const keywordApplyRef = useRef<(() => StructuredKeyword[] | null) | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiFetch<Folder[]>("/folders"),
  });

  useEffect(() => {
    setForm(withDerivedDeadline(job));
    setCurrentJob(job);
    setDirty(false);
    discardPending(pendingImages);
    setPendingImages([]);
    setDeletedImageIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when job identity changes
  }, [job.id]);

  const registerKeywordApply = useCallback(
    (fn: () => StructuredKeyword[] | null) => {
      keywordApplyRef.current = fn;
    },
    []
  );

  function updateForm(updates: Partial<JobPosting>) {
    setForm((prev) => ({ ...prev, ...updates }));
    setDirty(true);
  }

  function handlePendingChange(
    pending: PendingImage[],
    deletedIds: string[]
  ) {
    setPendingImages(pending);
    setDeletedImageIds(deletedIds);
    setDirty(true);
  }

  async function handleSave() {
    if (saving) return;

    let formToSave = { ...form };
    const appliedKeywords = keywordApplyRef.current?.();
    if (appliedKeywords) {
      formToSave = { ...formToSave, competency_keywords: appliedKeywords };
      setForm(formToSave);
    }

    setSaving(true);
    try {
      await apiFetch<JobPosting>(`/jobs/${job.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          folder_id: formToSave.folder_id,
          company_name: formToSave.company_name,
          job_title: formToSave.job_title,
          recruitment_field: formToSave.recruitment_field,
          job_description: formToSave.job_description,
          qualifications: formToSave.qualifications,
          preferences: formToSave.preferences,
          industry: formToSave.industry,
          deadline_raw: formToSave.deadline_raw,
          deadline_date: formToSave.deadline_date,
          deadline_status: formToSave.deadline_status,
          required_documents: formToSave.required_documents,
          application_method: formToSave.application_method,
          raw_text: formToSave.raw_text,
          memo: formToSave.memo,
          competency_keywords: formToSave.competency_keywords,
        }),
      });

      for (const id of deletedImageIds) {
        await apiFetch(`/jobs/${job.id}/images/${id}`, { method: "DELETE" });
      }

      for (const pending of pendingImages) {
        const formData = new FormData();
        formData.append("file", pending.file);
        await apiFetch(`/jobs/${job.id}/images`, {
          method: "POST",
          body: formData,
        });
      }

      discardPending(pendingImages);
      setPendingImages([]);
      setDeletedImageIds([]);

      const updated = await apiFetch<JobPosting>(`/jobs/${job.id}`);
      setDirty(false);
      onUpdated(updated);
      onClose();
      onSaved?.();
    } catch (err) {
      if (err instanceof ApiError) setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    discardPending(pendingImages);
    await apiFetch(`/jobs/${job.id}`, { method: "DELETE" });
    setShowDelete(false);
    onDeleted();
  }

  function handleClose() {
    if (dirty) {
      setShowLeave(true);
      return;
    }
    onClose();
  }

  function confirmLeave() {
    discardPending(pendingImages);
    setPendingImages([]);
    setDeletedImageIds([]);
    setShowLeave(false);
    onClose();
  }

  const dday = getDdayLabel(form.deadline_date, form.deadline_status);
  const folder = folders.find((f) => f.id === form.folder_id);
  const folderColor = folder
    ? FOLDER_SLOT_COLORS[folder.slot] ?? FOLDER_SLOT_COLORS[1]
    : null;
  const displayTitle =
    form.recruitment_field || form.job_title || "모집 분야 미정";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div
          className="font-pretendard relative z-10 flex w-full max-w-[1152px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          style={{
            height: `min(${layout.detailModalHeight}px, calc(100dvh - 1rem))`,
          }}
        >
          <div className="flex h-[41px] shrink-0 items-center justify-end bg-dd-black px-5">
            <button
              type="button"
              onClick={handleClose}
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

          <div className="relative flex shrink-0 items-start justify-between gap-2 overflow-visible px-[18px] pb-[15px] pt-[9px] md:items-center md:px-9 md:py-[15px]">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col items-start gap-[5px] md:flex-row md:flex-wrap-reverse md:items-center md:gap-3">
                <h2 className="order-2 max-w-full text-[20px] font-extrabold leading-[1.5] tracking-[-0.22px] text-dd-black md:order-none md:text-[30px] md:tracking-[-0.33px]">
                  {displayTitle}
                </h2>
                <div className="relative order-1 shrink-0 md:order-none">
                  <button
                    type="button"
                    onClick={() => setFolderOpen(!folderOpen)}
                    className="flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[10px] font-semibold tracking-[-0.11px] text-white md:px-[21px] md:text-base md:tracking-[-0.176px]"
                    style={{
                      backgroundColor: folderColor?.bg ?? "#19B469",
                    }}
                  >
                    {folder?.name ?? "저장 목적을 선택하세요"}
                    <AssetImage
                      src={assets.iconDetailChevron}
                      alt=""
                      width={9}
                      height={5}
                      placeholderClassName="bg-transparent"
                    />
                  </button>
                  {folderOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-dd-gray-400 bg-white shadow-lg">
                      {folders.map((f) => {
                        const color =
                          FOLDER_SLOT_COLORS[f.slot] ?? FOLDER_SLOT_COLORS[1];
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              updateForm({ folder_id: f.id });
                              setFolderOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-dd-gray-100"
                          >
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color.bg }}
                            />
                            {f.name}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          updateForm({ folder_id: null });
                          setFolderOpen(false);
                        }}
                        className="block w-full border-t border-dd-gray-200 px-4 py-2.5 text-left text-sm text-dd-gray-500 hover:bg-dd-gray-100"
                      >
                        미분류
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-sm tracking-[-0.154px] text-dd-black">
                {form.company_name || "기업명 없음"}
              </p>
            </div>

            {dday.label && (
              <span
                className={`shrink-0 self-center text-[30px] font-semibold leading-[1.5] tracking-[-0.33px] md:pl-4 md:text-[36px] md:tracking-[-0.396px] ${
                  dday.urgent
                    ? "text-dd-error"
                    : dday.expired
                      ? "text-dd-gray-500"
                      : "text-dd-black"
                }`}
              >
                {dday.label}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-end justify-center bg-white px-[18px] md:justify-start md:px-9">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-6 py-1.5 text-sm font-medium text-white transition ${
                  tab === t.id
                    ? "rounded-t-lg bg-dd-black"
                    : "rounded-t-lg bg-dd-gray-500"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {tab === "insight" && (
              <InsightTab
                form={form}
                onChange={updateForm}
                onRegisterKeywordApply={registerKeywordApply}
              />
            )}
            {tab === "original" && (
              <OriginalTab
                job={currentJob}
                form={form}
                onChange={updateForm}
                pendingImages={pendingImages}
                deletedImageIds={deletedImageIds}
                onPendingChange={handlePendingChange}
              />
            )}
            {tab === "memo" && <MemoTab form={form} onChange={updateForm} />}
          </div>

          <div className="flex shrink-0 flex-col gap-3 px-[21px] py-4 md:h-[66px] md:flex-row md:items-center md:justify-between md:gap-0 md:py-0">
            {form.source_url ? (
              <a
                href={form.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center rounded-full border border-dd-black bg-white px-[31px] py-2 text-sm font-semibold tracking-[-0.154px] text-dd-black md:w-auto"
              >
                원본 공고 보러가기
              </a>
            ) : (
              <span className="hidden md:block" />
            )}

            <div className="flex w-full items-center justify-between gap-[5px] md:w-auto md:justify-end">
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="rounded-full bg-dd-black px-[31px] py-2 text-sm font-semibold tracking-[-0.154px] text-white"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-dd-primary-green px-5 py-2 text-sm font-semibold tracking-[-0.154px] text-white disabled:bg-dd-gray-500"
              >
                {saving ? (
                  <>
                    저장중
                    <Spinner className="size-3" />
                  </>
                ) : (
                  "저장하기"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={saveError}
        title="안내"
        onClose={() => setSaveError(false)}
        variant="error"
        actions={
          <ModalButton variant="outline" onClick={() => setSaveError(false)}>
            닫기
          </ModalButton>
        }
      >
        <p>
          수정한 내용을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </Modal>

      <Modal
        open={showLeave}
        title="안내"
        onClose={() => setShowLeave(false)}
        variant="confirm-leave"
        actions={
          <>
            <ModalButton variant="danger" onClick={confirmLeave}>
              나가기
            </ModalButton>
            <ModalButton variant="outline" onClick={() => setShowLeave(false)}>
              취소
            </ModalButton>
          </>
        }
      >
        <p>저장하지 않은 변경사항이 있어요. 나가시겠어요?</p>
      </Modal>

      <Modal
        open={showDelete}
        title="안내"
        onClose={() => setShowDelete(false)}
        variant="confirm-delete"
        actions={
          <>
            <ModalButton variant="danger" onClick={handleDelete}>
              삭제하기
            </ModalButton>
            <ModalButton variant="outline" onClick={() => setShowDelete(false)}>
              취소
            </ModalButton>
          </>
        }
      >
        <p>삭제하시겠어요?</p>
      </Modal>
    </>
  );
}
