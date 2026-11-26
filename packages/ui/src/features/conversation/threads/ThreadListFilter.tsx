import { Input } from "@openbot/ui";
import { useText } from "@openbot/ui/text";

// Case- and diacritic-insensitive: "Ecole" matches "école", "ÉCOLE" matches "ecole".
export function foldThreadText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

// A thread matches when the query is in its title or in its latest-message preview.
export function threadMatchesQuery(query: string, ...texts: ReadonlyArray<string | undefined>): boolean {
  const needle = foldThreadText(query.trim());
  if (needle === "") return true;
  return texts.some((text) => text !== undefined && foldThreadText(text).includes(needle));
}

export function ThreadListFilter(props: {
  value: string;
  inputRef?: ((element: HTMLInputElement) => void) | undefined;
  onInput: (value: string) => void;
  onKeyDown?: ((event: KeyboardEvent) => void) | undefined;
}) {
  const { t } = useText();
  return (
    <div class="fork-thread-filter">
      <Input
        ref={props.inputRef}
        type="search"
        size="sm"
        dir="auto"
        class="fork-thread-filter-input"
        aria-label={t("common.search")}
        placeholder={t("common.search")}
        value={props.value}
        onInput={(event: InputEvent & { currentTarget: HTMLInputElement }) => props.onInput(event.currentTarget.value)}
        onKeyDown={(event: KeyboardEvent) => props.onKeyDown?.(event)}
      />
    </div>
  );
}
