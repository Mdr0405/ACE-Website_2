export const EVENT_CLUSTERS = [
  'Web Development',
  'IoT',
  'Cybersecurity',
  'Networks',
  'AI/ML',
  'Content Writing',
  'App Development',
  'Competitive Programming',
] as const;

export type EventCluster = (typeof EVENT_CLUSTERS)[number];
export type AdminCluster = RecruitmentCluster | 'Core';

const byKey = new Map<string, AdminCluster>(
  ([...RECRUITMENT_CLUSTERS, 'Core'] as AdminCluster[]).map((cluster) => [clusterKey(cluster), cluster])
);

function clusterKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveAdminCluster(value: string | null): AdminCluster | null {
  if (!value) return null;
  return byKey.get(clusterKey(value)) ?? null;
}

export function resolveEventCluster(value: string | null): EventCluster | null {
  const cluster = resolveAdminCluster(value);
  return EVENT_CLUSTERS.find((eventCluster) => eventCluster === cluster) ?? null;
}
import { RECRUITMENT_CLUSTERS, type RecruitmentCluster } from './recruitment';

