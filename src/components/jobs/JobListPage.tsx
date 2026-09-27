"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AssetImage } from "@/components/ui/AssetImage";
import { apiFetch, ApiError } from "@/lib/api-client";
import { assets } from "@/lib/assets";
import { keywordTexts, koThenEnCompare } from "@/lib/keywords";
import type { JobPosting, Profile } from "@/lib/types";
import { HeaderArea } from "../layout/HeaderArea";
import { TabGNB } from "../layout/GNB";
import { FilterBar } from "./FilterBar";
import { JobCard } from "./JobCard";
import { ManualAddCard } from "./ManualAddCard";
import { ManualAddModal } from "./ManualAddModal";
import { JobDetailModal } from "../job-detail/JobDetailModal";
import { Modal, ModalButton } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { Toast } from "../ui/Toast";
import { getParseFailureMessage } from "@/lib/parseFailureMessage";
import { OnboardingModal } from "../onboarding/OnboardingModal";

interface JobListPageProps {
  folderId?: string;
  uncategorized?: boolean;
}

export function JobListPage({ folderId, uncategorized }: JobListPageProps) {
  const queryClient = useQueryClient();
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [excludeExpired, setExcludeExpired] = useState(false);
  const [sort, setSort] = useState("saved_at_desc");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null);
  const [parseFailJob, setParseFailJob] = useState<JobPosting | null>(null);
  const [imageBasedJob, setImageBasedJob] = useState<JobPosting | null>(null);
  const [duplicateUrl, setDuplicateUrl] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [manualAddOpen, setManualAddOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [listResetKey, setListResetKey] = useState(0);
  const [urlResetKey, setUrlResetKey] = useState(0);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<Profile>("/profile"),
  });

  const queryKey = ["jobs", folderId, uncategorized, selectedKeywords, excludeExpired, sort];

  const { data: jobs = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (uncategorized) params.set("uncategorized", "true");
      if (excludeExpired) params.set("excludeExpired", "true");
      params.set("sort", sort);
      selectedKeywords.forEach((k) => params.append("keywords", k));
      return apiFetch<JobPosting[]>(`/jobs?${params.toString()}`);
    },
  });

  const { data: jobsForKeywords = [] } = useQuery({
    queryKey: ["jobs", "keyword-source", folderId, uncategorized, excludeExpired, sort],
    queryFn: () => {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (uncategorized) params.set("uncategorized", "true");
      if (excludeExpired) params.set("excludeExpired", "true");
      params.set("sort", sort);
      return apiFetch<JobPosting[]>(`/jobs?${params.toString()}`);
    },
  });

  const keywordOptions = useMemo(() => {
    const set = new Set<string>();
    for (const job of jobsForKeywords) {
      for (const kw of keywordTexts(job.competency_keywords)) {
        if (kw.trim()) set.add(kw);
      }
    }
    return [...set].sort(koThenEnCompare);
  }, [jobsForKeywords]);

  const resetListState = useCallback(() => {
    setSelectedKeywords([]);
    setExcludeExpired(false);
    setSort("saved_at_desc");
    setUrlResetKey((k) => k + 1);
    setListResetKey((k) => k + 1);
    window.scrollTo(0, 0);
  }, []);

  const handleParse = useCallback(
    async (url: string, selectedFolderId: string | null) => {
      setParseLoading(true);
      setNetworkError(false);
      try {
        const result = await apiFetch<{
          job: JobPosting;
          parseResult: string;
          is_image_based?: boolean;
        }>("/jobs/parse", {
          method: "POST",
          body: JSON.stringify({ url, folder_id: selectedFolderId }),
        });
        await queryClient.invalidateQueries({ queryKey: ["jobs"] });
        await queryClient.invalidateQueries({ queryKey: ["keywords"] });

        if (result.is_image_based) {
          setImageBasedJob(result.job);
        } else if (result.parseResult === "fail") {
          setParseFailJob(result.job);
        } else {
          // 완전 성공 / 부분 성공: 저장 완료 토스트만, 상세 이동 X
          setToastOpen(true);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === "duplicate_url") {
            setDuplicateUrl(true);
            return;
          }
          if (err.status < 500) throw err;
        }
        setNetworkError(true);
      } finally {
        setParseLoading(false);
      }
    },
    [queryClient]
  );

  const handleManualAdd = useCallback(
    async (rawText: string, folderId: string | null) => {
      setManualAddOpen(false);
      setParseLoading(true);
      setNetworkError(false);
      try {
        const draft = await apiFetch<JobPosting>("/jobs/parse-text", {
          method: "POST",
          body: JSON.stringify({ raw_text: rawText }),
        });
        // 서버 draft는 id 없이 온다 (아직 미저장) — JobDetailModal은 이걸로 draft 모드를 판단한다.
        setSelectedJob({
          ...draft,
          id: "",
          user_id: "",
          folder_id: folderId,
          memo: "",
          saved_at: "",
          updated_at: "",
        });
      } catch {
        setNetworkError(true);
      } finally {
        setParseLoading(false);
      }
    },
    []
  );

  async function confirmDelete() {
    if (!deleteTarget) return;
    await apiFetch(`/jobs/${deleteTarget.id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    setDeleteTarget(null);
    if (selectedJob?.id === deleteTarget.id) setSelectedJob(null);
  }

  useEffect(() => {
    if (profile && !profile.onboarding_completed_at) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const emptyMessage = uncategorized
    ? "미분류 공고가 없어요."
    : folderId
      ? "이 폴더에 등록된 공고가 없어요."
      : "첫 채용공고를 등록해 보세요!";

  const showEmptyIllustration = !folderId && !uncategorized && jobs.length === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden" key={listResetKey}>
      <HeaderArea
        key={urlResetKey}
        onSubmit={handleParse}
        loading={parseLoading}
      />
      <TabGNB onActiveTabReclick={resetListState} />

      <FilterBar
        allKeywords={keywordOptions}
        selectedKeywords={selectedKeywords}
        onKeywordsChange={setSelectedKeywords}
        excludeExpired={excludeExpired}
        onExcludeExpiredChange={setExcludeExpired}
        sort={sort}
        onSortChange={setSort}
      />

      <div className="flex-1 overflow-y-auto bg-dd-gray-100 px-20 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8 text-dd-green" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fill,252px)] justify-start gap-3">
              <ManualAddCard onClick={() => setManualAddOpen(true)} />
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onOpen={setSelectedJob}
                  onDelete={setDeleteTarget}
                  selectedKeywords={selectedKeywords}
                />
              ))}
            </div>

            {jobs.length === 0 &&
              (showEmptyIllustration ? (
                <div className="mt-6 flex justify-center">
                  <AssetImage
                    src={assets.listEmpty}
                    alt="사람인·잡코리아에서 URL을 복사해오세요. 저장하기 전 목적 태그로 분류하세요. 목적에 맞게 분류하고 조회하세요."
                    width={1042}
                    height={253}
                    className="h-auto w-full max-w-[1042px] object-contain"
                    placeholderClassName="h-[253px] w-full max-w-[1042px] rounded bg-dd-gray-200"
                    priority
                  />
                </div>
              ) : (
                <div className="mt-6 flex items-center justify-center py-24">
                  <p className="text-base font-medium text-dd-gray-500">
                    {emptyMessage}
                  </p>
                </div>
              ))}
          </>
        )}
      </div>

      {manualAddOpen && (
        <ManualAddModal
          onClose={() => setManualAddOpen(false)}
          onSubmit={handleManualAdd}
          loading={parseLoading}
        />
      )}

      {parseLoading && (
        <Modal open title="로딩 중" onClose={() => { }} variant="loading">
          <p>
            공고 내용을 가져오는 중이에요! 공고 내용이 완전하지 않을 수 있어요.
            확인 후 수정해서 저장해 보세요.
          </p>
        </Modal>
      )}

      <Modal
        open={!!parseFailJob}
        title="안내"
        onClose={() => setParseFailJob(null)}
        variant="parse-fail"
        actions={
          <>
            <ModalButton
              variant="primary"
              onClick={() => {
                setSelectedJob(parseFailJob);
                setParseFailJob(null);
              }}
            >
              진행하기
            </ModalButton>
            <ModalButton variant="outline" onClick={() => setParseFailJob(null)}>
              취소
            </ModalButton>
          </>
        }
      >
        <p>
          {getParseFailureMessage(parseFailJob?.parse_failure_reason)}{" "}
          수동 입력으로 진행하시겠어요?
        </p>
      </Modal>

      <Modal
        open={!!imageBasedJob}
        title="안내"
        onClose={() => setImageBasedJob(null)}
        variant="parse-fail"
        actions={
          <ModalButton
            variant="primary"
            onClick={() => {
              setSelectedJob(imageBasedJob);
              setImageBasedJob(null);
            }}
          >
            확인
          </ModalButton>
        }
      >
        <p>
          이미지형 공고는 내용 인식이 정확하지 않을 수 있어요.
          <br />
          입력된 내용을 검토해 주세요.
        </p>
      </Modal>

      <Modal
        open={duplicateUrl}
        title="안내"
        onClose={() => setDuplicateUrl(false)}
        variant="error"
        actions={
          <ModalButton variant="outline" onClick={() => setDuplicateUrl(false)}>
            닫기
          </ModalButton>
        }
      >
        <p>이미 저장된 공고입니다.</p>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="안내"
        onClose={() => setDeleteTarget(null)}
        variant="confirm-delete"
        actions={
          <>
            <ModalButton variant="danger" onClick={confirmDelete}>
              삭제하기
            </ModalButton>
            <ModalButton variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </ModalButton>
          </>
        }
      >
        <p>삭제하시겠어요?</p>
      </Modal>

      <Modal
        open={networkError}
        title="안내"
        onClose={() => setNetworkError(false)}
        variant="error"
        actions={
          <ModalButton variant="outline" onClick={() => setNetworkError(false)}>
            닫기
          </ModalButton>
        }
      >
        <p>인터넷 연결을 확인하고 다시 시도해 주세요.</p>
      </Modal>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSaved={() => setToastOpen(true)}
          onUpdated={(updated) => {
            setSelectedJob(updated);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
            queryClient.invalidateQueries({ queryKey: ["keywords"] });
          }}
          onDeleted={() => {
            setSelectedJob(null);
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
          }}
        />
      )}

      <Toast
        message="저장이 완료되었어요!"
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />

      <OnboardingModal
        open={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }}
      />
    </div>
  );
}
