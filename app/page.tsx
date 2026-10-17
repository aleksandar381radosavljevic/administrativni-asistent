import {
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@aleksandar381radosavljevic/osnova-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { AssistantPromo } from "@/components/public/AssistantPromo/AssistantPromo";
import { ExampleLinks } from "@/components/public/ExampleLinks/ExampleLinks";
import { FeaturedStickers } from "@/components/public/FeaturedStickers/FeaturedStickers";
import { HomeHero } from "@/components/public/HomeHero/HomeHero";
import { LifeEventCatalog } from "@/components/public/LifeEventCatalog/LifeEventCatalog";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { TrustStrip } from "@/components/public/TrustStrip/TrustStrip";
import {
  exampleLifeEvents,
  featuredLifeEvents,
  groupByCategory,
} from "@/lib/domain/categories";
import { labels } from "@/lib/i18n/labels";
import { listCategories } from "@/lib/services/categories";
import { listLifeEvents } from "@/lib/services/life-events";
import styles from "./page.module.css";

const SEARCH_INPUT_ID = "pretraga";

// The API caps a page at 100; v1 has about 20 life events (00 §2).
const ALL_LIFE_EVENTS = { limit: 100, offset: 0 } as const;

// P1 Home (08 P1, ADR 0020). The headline and search are the static shell;
// everything built from the catalog streams in.
export default function HomePage() {
  return (
    <div className={styles.page}>
      <HomeHero
        searchInputId={SEARCH_INPUT_ID}
        examples={
          <Suspense fallback={null}>
            <Examples />
          </Suspense>
        }
        featured={
          <Suspense fallback={<FeaturedSkeleton />}>
            <Featured />
          </Suspense>
        }
      />
      <TrustStrip />
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog />
      </Suspense>
      <AssistantPromo />
    </div>
  );
}

// Waiting for the request keeps the reads out of the build-time prerender:
// the build must not need Supabase (04 §3.2). Both reads are cached, so the
// three sections below share them.
async function loadGroups() {
  await connection();
  const [categories, lifeEvents] = await Promise.all([
    listCategories(),
    listLifeEvents(ALL_LIFE_EVENTS),
  ]);
  return groupByCategory(categories.data, lifeEvents.data);
}

async function Examples() {
  return <ExampleLinks lifeEvents={exampleLifeEvents(await loadGroups())} />;
}

async function Featured() {
  const featured = featuredLifeEvents(await loadGroups());
  return featured.length > 0 ? <FeaturedStickers items={featured} /> : null;
}

async function Catalog() {
  const groups = await loadGroups();
  if (groups.length === 0) {
    return (
      <EmptyState
        icon="clipboard-list"
        title={labels.home.emptyTitle}
        description={labels.home.emptyDescription}
        action={<TextLink href="/ai">{labels.layout.askAssistant}</TextLink>}
      />
    );
  }
  return <LifeEventCatalog groups={groups} />;
}

function FeaturedSkeleton() {
  return (
    <SkeletonGroup label={labels.home.loading} className={styles.skeletonRow}>
      {Array.from({ length: 2 }, (_, i) => (
        <Skeleton key={i} shape="block" height="16rem" />
      ))}
    </SkeletonGroup>
  );
}

function CatalogSkeleton() {
  return (
    <SkeletonGroup label={labels.home.loading} className={styles.skeleton}>
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} shape="block" height="8rem" />
      ))}
    </SkeletonGroup>
  );
}
