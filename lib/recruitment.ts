export const RECRUITMENT_CLUSTERS = [
  'Web Development',
  'App Development',
  'AI/ML',
  'Cybersecurity',
  'IoT',
  'Networks',
  'Competitive Programming',
  'OpCon & PR',
  'Graphic Designing',
  'Video Editing',
  'Content Writing',
] as const;

export type RecruitmentCluster = (typeof RECRUITMENT_CLUSTERS)[number];

export const COURSE_OPTIONS = [
  { value: 'CSE', label: 'Computer Science & Engineering' },
  { value: 'CSE-AI', label: 'CSE (AI & Data Science)' },
  { value: 'IT', label: 'Information Technology' },
  { value: 'CSE-CYBER', label: 'CSE (Cyber Security & Blockchain)' },
  { value: 'CSE-IOT', label: 'CSE (IoT & Automation)' },
  { value: 'ICT', label: 'Information & Communication Technology' },
  { value: 'OTHER', label: 'Other course' },
] as const;

export type CourseValue = (typeof COURSE_OPTIONS)[number]['value'];

const clusterByKey = new Map<string, RecruitmentCluster>(
  RECRUITMENT_CLUSTERS.map((cluster) => [clusterKey(cluster), cluster])
);

function clusterKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveRecruitmentCluster(value: string | null): RecruitmentCluster | null {
  if (!value) return null;
  return clusterByKey.get(clusterKey(value)) ?? null;
}

export function recruitmentClusterForTitle(title: string): RecruitmentCluster | null {
  if (title === 'AI ML') return 'AI/ML';
  if (title === 'IOT & Embedded Systems') return 'IoT';
  return resolveRecruitmentCluster(title);
}

export function isCourseValue(value: string): value is CourseValue {
  return COURSE_OPTIONS.some((course) => course.value === value);
}

export type RecruitmentQuestion = {
  id: string; // stable key, used as the JSON key in answers
  label: string;
  type: 'text'; // later: 'select' | 'radio' | 'checkbox' ...
  required?: boolean;
  placeholder?: string;
};
export function parseQuestions(value: unknown): RecruitmentQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (q): q is RecruitmentQuestion =>
      !!q &&
      typeof q === 'object' &&
      typeof (q as any).id === 'string' &&
      typeof (q as any).label === 'string'
  );
}

