import type { Metadata } from "next";
import { QueryProvider } from "@/providers/QueryProvider";
import { PostHogProvider } from "@/providers/PostHogProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "딱풀 - 개인 채용공고 라이브러리",
  description: "채용공고를 저장하고 목적별로 관리하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-pretendard min-h-dvh bg-dd-gray-100 text-dd-black antialiased">
        <PostHogProvider>
          <QueryProvider>{children}</QueryProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
