import {
  Card,
  EmptyState,
  Skeleton,
  SkeletonGroup,
} from "@aleksandar381radosavljevic/osnova-react";
import { Suspense } from "react";
import { LifeEventCatalog } from "@/components/public/LifeEventCatalog/LifeEventCatalog";
import { SearchField } from "@/components/public/SearchField/SearchField";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { groupByCategory, selectedCategory } from "@/lib/domain/categories";
import { labels } from "@/lib/i18n/labels";
import { listCategories } from "@/lib/services/categories";
import { listLifeEvents } from "@/lib/services/life-events";
import styles from "./page.module.css";

const SEARCH_INPUT_ID = "pretraga";

// The API caps a page at 100; v1 has about 20 life events (00 §2).
const ALL_LIFE_EVENTS = { limit: 100, offset: 0 } as const;

// P1 Home (08 P1). The heading and search are the static shell; the catalog
// streams in, because `?kategorija=` is only known at request time.
export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>{labels.home.eyebrow}</p>
        <h1 className={styles.title}>{labels.home.title}</h1>
        <p className={styles.lead}>{labels.home.intro}</p>
        <SearchField id={SEARCH_INPUT_ID} />
      </div>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Catalog({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  // Awaiting the request first keeps the reads out of the build-time
  // prerender: the build must not need Supabase (04 §3.2).
  const { kategorija } = await searchParams;
  const [categories, lifeEvents] = await Promise.all([
    listCategories(),
    listLifeEvents(ALL_LIFE_EVENTS),
  ]);
  const groups = groupByCategory(categories.data, lifeEvents.data);

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

  return (
    <>
      <LifeEventCatalog
        groups={groups}
        selected={selectedCategory(groups, kategorija)}
      />
      <Card as="section" className={styles.help} aria-labelledby="pomoc">
        <h2 id="pomoc" className={styles.helpTitle}>
          {labels.home.notFoundTitle}
        </h2>
        <div className={styles.helpLinks}>
          <TextLink href="/ai">{labels.layout.askAssistant}</TextLink>
          <TextLink href={`#${SEARCH_INPUT_ID}`}>
            {labels.home.searchLink}
          </TextLink>
        </div>
      </Card>
    </>
  );
}

function CatalogSkeleton() {
  return (
    <SkeletonGroup label={labels.home.loading} className={styles.skeleton}>
      <div className={styles.skeletonChips}>
        <Skeleton shape="block" width="4rem" height="2.75rem" />
        <Skeleton shape="block" width="7rem" height="2.75rem" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} shape="block" height="4rem" />
      ))}
    </SkeletonGroup>
  );
}
