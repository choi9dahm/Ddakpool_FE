export type KeywordSourceSection = "자격요건" | "우대사항" | "기타";
export type KeywordSource = "llm" | "user";
export type DeadlineStatus = "always_open" | "closed" | null;

export interface StructuredKeyword {
  text: string;
  source_section: KeywordSourceSection;
  order: number;
  source: KeywordSource;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  slot: number;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  user_id: string;
  source_url: string;
  platform: string;
  parsing_status: "success" | "partial" | "fail";
  parse_failure_reason: string | null;
  folder_id: string | null;
  company_name: string;
  job_title: string;
  recruitment_field: string;
  job_description: string;
  qualifications: string;
  preferences: string;
  industry: string;
  deadline_raw: string;
  deadline_date: string | null;
  deadline_status: DeadlineStatus;
  required_documents: string;
  application_method: string;
  raw_text: string;
  memo: string;
  competency_keywords: StructuredKeyword[];
  is_image_based?: boolean;
  saved_at: string;
  updated_at: string;
  job_posting_images?: JobImage[];
}

export interface JobImage {
  id: string;
  storage_path: string;
  sort_order: number;
}

export interface Profile {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
}
