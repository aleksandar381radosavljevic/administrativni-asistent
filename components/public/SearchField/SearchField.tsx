"use client";

import { Button, Input } from "@aleksandar381radosavljevic/osnova-react";
import Form from "next/form";
import { useRef, useState, type FormEvent } from "react";
import { isSearchTermLongEnough, SEARCH_MAX_LENGTH } from "@/lib/domain/search";
import { labels } from "@/lib/i18n/labels";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  /** The input's id, so a "Pretraži" link elsewhere can point at it. */
  id: string;
  defaultValue?: string;
}

/**
 * Search form (06 §12.11). Submits to /pretraga as a plain GET form, so it
 * works without JavaScript; with JavaScript a term shorter than 2 characters
 * shows an error instead of navigating (08 P1).
 */
export function SearchField({ id, defaultValue }: SearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isSearchTermLongEnough(inputRef.current?.value ?? "")) return;
    event.preventDefault();
    setError(labels.search.tooShort);
    inputRef.current?.focus();
  }

  return (
    <Form
      action="/pretraga"
      role="search"
      className={styles.root}
      onSubmit={handleSubmit}
    >
      <Input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        label={labels.search.label}
        hideLabel
        iconStart="search"
        placeholder={labels.search.placeholder}
        defaultValue={defaultValue}
        maxLength={SEARCH_MAX_LENGTH}
        autoComplete="off"
        error={error}
        onChange={() => setError(undefined)}
        className={styles.field}
      />
      <Button type="submit" className={styles.submit}>
        {labels.search.submit}
      </Button>
    </Form>
  );
}
