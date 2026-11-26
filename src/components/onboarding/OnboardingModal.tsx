"use client";

import { useState } from "react";
import { AssetImage } from "@/components/ui/AssetImage";
import { assets } from "@/lib/assets";
import { apiFetch } from "@/lib/api-client";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const SLIDES = [
  {
    title: "사람인·잡코리아에서 URL을 복사해서 붙여넣기 해주세요",
    desc: "마음에 드는 공고 페이지에서 주소창의 URL을 복사한 뒤, 딱풀에 붙여넣기만 하면 돼요",
  },
  {
    title: "저장하기 전,\n저장 목적에 따라 폴더로 분류해주세요",
    desc: "지원예정, 관심기업, 직무분석 등 나만의 기준으로 폴더를 만들어 공고를 분류할 수 있어요",
  },
  {
    title: "목적에 맞게\n분류하고 조회해보세요!",
    desc: "폴더별로 모아둔 공고를 한눈에 확인하세요\n역량 키워드로 원하는 공고만 따로 찾아볼 수도 있어요!",
    cta: "공고 저장하러 가기!",
  },
];

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  async function finish() {
    await apiFetch("/profile/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
    });
    onComplete();
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90dvh] w-full max-w-[400px] flex-col overflow-y-auto rounded-[30px] bg-white shadow-xl">
        <AssetImage
          src={assets.onboarding[step] ?? assets.onboarding[0]}
          alt=""
          width={400}
          height={280}
          className="h-[200px] w-full shrink-0 object-cover sm:h-[280px]"
          placeholderClassName="h-[200px] w-full bg-dd-gray-200 sm:h-[280px]"
        />

        <div className="flex shrink-0 justify-center gap-2 py-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`${i + 1}번째 슬라이드`}
              aria-current={i === step ? "true" : undefined}
              className="flex h-5 items-center justify-center px-0.5"
            >
              <span
                className={`block h-1 w-[30px] rounded-sm transition ${
                  i === step
                    ? "bg-dd-primary-green"
                    : "bg-dd-gray-200 hover:bg-dd-gray-400"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="flex shrink-0 flex-col px-6 pb-6 pt-1 sm:px-8">
          <h2 className="whitespace-pre-line text-lg font-bold leading-snug text-dd-black">
            {slide.title}
          </h2>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-dd-gray-500">
            {slide.desc}
          </p>

          <div className="mt-3 flex gap-2">
            {!isLast && (
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded-xl border border-dd-gray-400 py-3 text-sm"
              >
                건너뛰기
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                className="w-full rounded-xl bg-dd-black py-3 text-sm font-medium text-white"
              >
                {slide.cta ?? "시작하기"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 rounded-xl bg-dd-black py-3 text-sm font-medium text-white"
              >
                다음
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
