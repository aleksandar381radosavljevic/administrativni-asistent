"use client";

import { Button } from "@aleksandar381radosavljevic/osnova-react";
import { PageMessage } from "@/components/public/PageMessage/PageMessage";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { labels } from "@/lib/i18n/labels";

// 5xx or network failure while rendering a page (08 §0.5). Technical details
// are never shown; Sentry reporting comes with the monitoring setup (04 §8).
export default function PageError({ retry }: { retry: () => void }) {
  return (
    <PageMessage
      icon="triangle-alert"
      tone="danger"
      title={labels.errors.pageTitle}
      action={
        <>
          <Button variant="secondary" iconStart="rotate-cw" onClick={retry}>
            {labels.errors.retry}
          </Button>
          <TextLink href="/">{labels.errors.home}</TextLink>
        </>
      }
    />
  );
}
