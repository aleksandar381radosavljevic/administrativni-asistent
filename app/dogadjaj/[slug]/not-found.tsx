import { PageMessage } from "@/components/public/PageMessage/PageMessage";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { labels } from "@/lib/i18n/labels";

// P8 for a life event that does not exist or is not public (08 P3).
export default function LifeEventNotFound() {
  return (
    <PageMessage
      icon="circle-help"
      title={labels.lifeEvent.notFound}
      action={<TextLink href="/">{labels.errors.home}</TextLink>}
    />
  );
}
