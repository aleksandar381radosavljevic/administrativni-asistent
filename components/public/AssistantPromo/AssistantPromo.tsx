import { Button } from "@aleksandar381radosavljevic/osnova-react";
import { EventArt } from "@/components/public/EventArt/EventArt";
import { labels } from "@/lib/i18n/labels";
import styles from "./AssistantPromo.module.css";

/** Home's band that points to the assistant (P7, ADR 0020). */
export function AssistantPromo() {
  return (
    <section aria-labelledby="asistent" className={styles.root}>
      <div className={styles.text}>
        <h2 id="asistent" className={styles.title}>
          {labels.home.assistantTitle}
        </h2>
        <p className={styles.lead}>{labels.home.assistantText}</p>
        <Button href="/ai" size="lg" iconEnd="arrow-right">
          {labels.layout.askAssistant}
        </Button>
      </div>
      <EventArt icon="message-circle" className={styles.art} />
    </section>
  );
}
