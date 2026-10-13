import {
  Skeleton,
  SkeletonGroup,
} from "@aleksandar381radosavljevic/osnova-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LifeEventView } from "@/components/public/LifeEventView/LifeEventView";
import { labels } from "@/lib/i18n/labels";
import { getLifeEventBySlug } from "@/lib/services/life-events";
import styles from "./page.module.css";

type Props = PageProps<"/dogadjaj/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lifeEvent = await getLifeEventBySlug((await params).slug);
  return lifeEvent
    ? { title: `${lifeEvent.title} · ${labels.layout.appName}` }
    : {};
}

// P3 Life event (08 P3). The slug is only known at request time (the build
// must not need Supabase), so the content streams in behind a skeleton.
export default function LifeEventPage({ params }: Props) {
  return (
    <Suspense fallback={<LifeEventSkeleton />}>
      <LifeEventContent params={params} />
    </Suspense>
  );
}

async function LifeEventContent({ params }: Pick<Props, "params">) {
  const lifeEvent = await getLifeEventBySlug((await params).slug);
  if (lifeEvent === null) notFound();
  return <LifeEventView lifeEvent={lifeEvent} />;
}

function LifeEventSkeleton() {
  return (
    <SkeletonGroup label={labels.lifeEvent.loading} className={styles.skeleton}>
      <Skeleton width="8rem" />
      <Skeleton shape="block" height="3rem" width="70%" />
      <Skeleton shape="block" height="3.5rem" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} shape="block" height="7rem" />
      ))}
    </SkeletonGroup>
  );
}
