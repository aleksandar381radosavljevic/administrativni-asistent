import { PageMessage } from "@/components/public/PageMessage/PageMessage";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { labels } from "@/lib/i18n/labels";

// P8 for any unknown address (08 §0.5).
export default function NotFound() {
  return (
    <PageMessage
      icon="circle-help"
      title={labels.errors.notFoundTitle}
      description={labels.errors.notFoundDescription}
      action={<TextLink href="/">{labels.errors.home}</TextLink>}
    />
  );
}
