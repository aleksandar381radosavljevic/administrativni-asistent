import {
  Skeleton,
  SkeletonGroup,
} from "@aleksandar381radosavljevic/osnova-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChecklistView } from "@/components/public/ChecklistView/ChecklistView";
import { categoryToneOf } from "@/lib/domain/categories";
import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import { listCategories } from "@/lib/services/categories";
import { getLifeEventBySlug } from "@/lib/services/life-events";
import styles from "./page.module.css";

type Props = PageProps<"/dogadjaj/[slug]/checklist">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lifeEvent = await getLifeEventBySlug((await params).slug);
  return lifeEvent
    ? {
        title: `${format(labels.checklistPage.title, { title: lifeEvent.title })} · ${labels.layout.appName}`,
      }
    : {};
}

// P4 Checklist (08 P4). The life event streams in like on P3; the progress
// itself lives only in the browser (ChecklistView).
export default function ChecklistPage({ params }: Props) {
  return (
    <Suspense fallback={<ChecklistSkeleton />}>
      <ChecklistContent params={params} />
    </Suspense>
  );
}

async function ChecklistContent({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [lifeEvent, categories] = await Promise.all([
    getLifeEventBySlug(slug),
    listCategories(),
  ]);
  if (lifeEvent === null) notFound();
  return (
    <ChecklistView
      lifeEvent={lifeEvent}
      tone={categoryToneOf(categories.data, lifeEvent.category.id)}
    />
  );
}

function ChecklistSkeleton() {
  return (
    <SkeletonGroup
      label={labels.checklistPage.loading}
      className={styles.skeleton}
    >
      <Skeleton width="8rem" />
      <Skeleton shape="block" height="2.5rem" width="70%" />
      <Skeleton shape="block" height="1.5rem" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} shape="block" height="6rem" />
      ))}
    </SkeletonGroup>
  );
}
