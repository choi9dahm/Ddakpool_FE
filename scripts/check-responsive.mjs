/**
 * 반응형 검증: 360 / 768 / 1280 폭에서 가로 넘침을 찾고 스크린샷을 남긴다.
 *
 * Usage:
 *   npx next dev -p 3100
 *   BASE_URL=http://localhost:3100 node scripts/check-responsive.mjs
 *
 * Supabase env가 없으면 dev 쿠키(ddakpool-dev-auth)로 /all, /settings 에 진입한다.
 * BE가 없어도 레이아웃 셸은 렌더되므로 넘침 검사에는 충분하다.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? path.resolve(__dirname, "../docs/responsive-shots");

// BE 없이도 목록/카드/상세가 렌더되도록 API 응답을 가로챈다.
const API = process.env.API_BASE_URL ?? "http://localhost:4000";

const FOLDERS = ["지원예정", "관심기업", "직무분석", "포폴참고", "스터디"].map(
  (name, i) => ({
    id: `f${i + 1}`,
    user_id: "u1",
    name,
    slot: i + 1,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  })
);

const kw = (texts) =>
  texts.map((text, order) => ({
    text,
    source_section: "자격요건",
    order,
    source: "llm",
  }));

const JOBS = [
  ["토스페이먼츠", "프로덕트 디자이너 (주니어)", "f1", "2026-12-24", ["Figma", "디자인시스템", "사용자리서치"]],
  ["당근마켓", "UX 라이터", "f2", "2026-12-01", ["카피라이팅", "그로스"]],
  ["배달의민족", "브랜드 디자이너", null, null, ["브랜딩", "모션그래픽", "타이포그래피"]],
  ["카카오스타일", "서비스 기획자", "f3", "2027-02-10", ["데이터분석", "A/B테스트"]],
  ["무신사", "콘텐츠 마케터", "f4", "2026-11-30", ["SNS운영", "퍼포먼스마케팅"]],
  ["네이버웹툰", "UI 디자이너", "f5", null, ["인터랙션", "프로토타이핑"]],
].map(([company, field, folder, deadline, keywords], i) => ({
  id: `j${i + 1}`,
  user_id: "u1",
  source_url: "https://example.com/job",
  platform: "saramin",
  parsing_status: "success",
  parse_failure_reason: null,
  folder_id: folder,
  company_name: company,
  job_title: field,
  recruitment_field: field,
  job_description: "담당 업무 설명이 들어가는 자리입니다.",
  qualifications: "자격 요건이 들어가는 자리입니다.",
  preferences: "우대 사항이 들어가는 자리입니다.",
  industry: "IT·웹·통신",
  deadline_raw: deadline ?? "상시채용",
  deadline_date: deadline,
  deadline_status: deadline ? null : "always_open",
  required_documents: "이력서, 포트폴리오",
  application_method: "자사 채용 페이지 지원",
  raw_text: "공고 원문 텍스트가 들어가는 자리입니다.",
  memo: "",
  competency_keywords: kw(keywords),
  saved_at: "2025-11-20T00:00:00Z",
  updated_at: "2025-11-20T00:00:00Z",
  job_posting_images: [],
}));

const PROFILE = {
  id: "u1",
  email: "test@test.com",
  nickname: "딱풀러",
  avatar_url: null,
  onboarding_completed_at: "2025-01-01T00:00:00Z",
  created_at: "2025-01-01T00:00:00Z",
};

async function mockApi(ctx) {
  await ctx.route(`${API}/**`, (route) => {
    const url = new URL(route.request().url());
    let body = null;
    if (url.pathname === "/profile") body = PROFILE;
    else if (url.pathname === "/folders") body = FOLDERS;
    else if (url.pathname === "/jobs") body = JOBS;
    if (body === null) return route.fulfill({ status: 404, body: "{}" });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

const WIDTHS = [
  { name: "360", width: 360, height: 740 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
];

// auth: true 는 dev 쿠키가 필요한 화면. 로그인/가입 화면은 쿠키가 있으면
// /all 로 리다이렉트되므로 쿠키 없는 컨텍스트에서 따로 연다.
// open: 해당 화면에서 추가로 눌러 열어볼 오버레이.
const PAGES = [
  { name: "login", url: "/login", auth: false },
  { name: "login-guest-popup", url: "/login", auth: false, open: "로그인 없이 계속" },
  { name: "signup", url: "/signup", auth: false },
  { name: "all", url: "/all", auth: true },
  { name: "all-keyword-dropdown", url: "/all", auth: true, open: "역량키워드" },
  { name: "all-job-detail", url: "/all", auth: true, open: "프로덕트 디자이너 (주니어)" },
  { name: "all-folder-edit", url: "/all", auth: true, open: "폴더 수정하기" },
  { name: "all-manual-add", url: "/all", auth: true, open: "새로운 공고 추가" },
  { name: "settings", url: "/settings", auth: true },
  { name: "settings-onboarding", url: "/settings", auth: true, open: "온보딩 미리보기" },
];

// 뷰포트보다 넓거나 왼쪽으로 삐져나온 요소를 찾는다.
// 가로 스크롤 컨테이너(overflow-x: auto/scroll) 안쪽은 의도된 것이라 제외한다.
const OVERFLOW_PROBE = `(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    return false;
  };
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (cs.position === "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      if (inScroller(el)) continue;
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 110),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
      });
    }
  }
  return {
    vw,
    docScrollWidth: document.documentElement.scrollWidth,
    bad: bad.slice(0, 12),
  };
})()`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  let problems = 0;

  for (const vp of WIDTHS) {
    const viewport = { width: vp.width, height: vp.height };
    const authCtx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await authCtx.addCookies([
      { name: "ddakpool-dev-auth", value: "1", domain: "localhost", path: "/" },
    ]);
    const anonCtx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await mockApi(authCtx);
    const authPage = await authCtx.newPage();
    const anonPage = await anonCtx.newPage();

    for (const p of PAGES) {
      const page = p.auth ? authPage : anonPage;
      await page.goto(BASE + p.url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      if (p.open) {
        const target = page
          .locator(
            `[aria-label="${p.open}"], button:has-text("${p.open}"), a:has-text("${p.open}"), h3:has-text("${p.open}")`
          )
          .first();
        await target.click();
        await page.waitForTimeout(800);
      }
      const res = await page.evaluate(OVERFLOW_PROBE);
      const horiz = res.docScrollWidth > res.vw + 1;
      if (horiz || res.bad.length) problems++;
      console.log(
        `${horiz || res.bad.length ? "FAIL" : "ok  "} ${vp.name}px ${p.url}  vw=${res.vw} docScrollW=${res.docScrollWidth} offenders=${res.bad.length}`
      );
      for (const b of res.bad) {
        console.log(`       <${b.tag}> l=${b.left} r=${b.right} w=${b.w} :: ${b.cls}`);
      }
      await page.screenshot({ path: path.join(OUT, `${vp.name}-${p.name}.png`) });
    }

    await authCtx.close();
    await anonCtx.close();
  }

  await browser.close();
  console.log(problems ? `\n${problems} page(s) with overflow` : "\nno overflow anywhere");
  process.exitCode = problems ? 1 : 0;
}

main();
