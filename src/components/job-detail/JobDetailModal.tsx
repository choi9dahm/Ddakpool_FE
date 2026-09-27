"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getDdayLabel } from "@/lib/dday";
import { deriveDeadlineStatus } from "@/lib/deadlineStatus";
import { layout } from "@/lib/design-tokens";
import type { Folder, JobPosting, StructuredKeyword } from "@/lib/types";
import { InsightTab } from "./InsightTab";
import { OriginalTab, type PendingImage } from "./OriginalTab";
import { MemoTab } from "./MemoTab";
import { Modal, ModalButton } from "../ui/Modal";
import { SaveButton } from "../ui/SaveButton";
import { FolderPicker } from "../ui/FolderPicker";
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
  const isDraft = !job.id;
  const [tab, setTab] = useState<Tab>("insight");
  const [form, setForm] = useState<JobPosting>(() => withDerivedDeadline(job));
  const [dirty, setDirty] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [requiredFieldError, setRequiredFieldError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentJob, setCurrentJob] = useState(job);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const keywordApplyRef = useRef<(() => StructuredKeyword[] | null) | null>(null);
  // draft(수동 추가)의 첫 POST 성공 후 id를 담아둔다. 이미지 업로드 등 이후 단계가
  // 실패해 '저장하기'를 다시 눌러도 공고가 중복 생성되지 않게 하기 위함.
  const createdIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isDraft) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDraft]);

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

    if (isDraft && (!form.company_name.trim() || !form.recruitment_field.trim())) {
      setTab("insight");
      setRequiredFieldError(true);
      return;
    }

    let formToSave = { ...form };
    const appliedKeywords = keywordApplyRef.current?.();
    if (appliedKeywords) {
      formToSave = { ...formToSave, competency_keywords: appliedKeywords };
      setForm(formToSave);
    }

    setSaving(true);
    try {
      const payload = {
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
      };

      // draft의 첫 POST가 이미 성공했는데 이미지 업로드 등에서 재시도되는 경우
      // 다시 POST하면 공고가 중복 생성된다 — 생성된 id가 있으면 그 뒤로는 PATCH.
      const targetId = createdIdRef.current ?? job.id;
      const saved =
        isDraft && !createdIdRef.current
          ? await apiFetch<JobPosting>("/jobs", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          : await apiFetch<JobPosting>(`/jobs/${targetId}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
      createdIdRef.current = saved.id;

      for (const id of deletedImageIds) {
        await apiFetch(`/jobs/${saved.id}/images/${id}`, { method: "DELETE" });
      }

      for (const pending of pendingImages) {
        const formData = new FormData();
        formData.append("file", pending.file);
        await apiFetch(`/jobs/${saved.id}/images`, {
          method: "POST",
          body: formData,
        });
      }

      discardPending(pendingImages);
      setPendingImages([]);
      setDeletedImageIds([]);

      const updated = await apiFetch<JobPosting>(`/jobs/${saved.id}`);
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
    if (dirty || isDraft) {
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
                <FolderPicker
                  folders={folders}
                  value={form.folder_id}
                  onChange={(id) => updateForm({ folder_id: id })}
                  wrapperClassName="relative order-1 shrink-0 md:order-none"
                />
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
              {!isDraft && (
                <button
                  type="button"
                  onClick={() => setShowDelete(true)}
                  className="rounded-full bg-dd-black px-[31px] py-2 text-sm font-semibold tracking-[-0.154px] text-white"
                >
                  삭제
                </button>
              )}
              <SaveButton
                onClick={handleSave}
                disabled={(!dirty && !isDraft) || saving}
                saving={saving}
              />
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
        open={requiredFieldError}
        title="안내"
        onClose={() => setRequiredFieldError(false)}
        variant="error"
        actions={
          <ModalButton
            variant="outline"
            onClick={() => setRequiredFieldError(false)}
          >
            닫기
          </ModalButton>
        }
      >
        <p>필수 입력 필드를 채워주세요.</p>
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
