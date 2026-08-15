import {
  Button,
  Input,
  type ButtonAttributes,
  type InputProps,
} from "@gluonjs/atoms";
import {
  defineMolecule,
  type TemplateResult,
  type TemplateValue,
} from "@gluonjs/core";
import { q, type QuarkProps } from "@gluonjs/quarks";
import { searchFieldStyleDependency } from "./search-field-styles.js";

export type SearchFieldAttributes = Omit<
  QuarkProps<HTMLFormElement>,
  "children" | "role"
>;
export type SearchFieldInputAttributes = InputProps["attributes"];

export interface SearchFieldProps {
  readonly id: string;
  readonly label: string;
  readonly query?: string;
  readonly onQueryChange?: (query: string, event: InputEvent) => void;
  readonly onSubmit?: (event: SubmitEvent) => void;
  readonly placeholder?: string;
  readonly name?: string;
  readonly submitLabel?: string;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly inputAttributes?: SearchFieldInputAttributes;
  readonly submitAttributes?: ButtonAttributes;
  readonly attributes?: SearchFieldAttributes;
}

function renderSearchField({
  id,
  label,
  query = "",
  onQueryChange,
  onSubmit,
  placeholder,
  name = "query",
  submitLabel = "Search",
  loading = false,
  disabled = false,
  inputAttributes = {},
  submitAttributes = {},
  attributes = {},
}: SearchFieldProps): TemplateResult {
  assertDomId("SearchField.id", id);
  assertNonEmpty("SearchField.label", label);
  assertNonEmpty("SearchField.name", name);
  assertNonEmpty("SearchField.submitLabel", submitLabel);
  const inputId = inputAttributes.id ?? `${id}-input`;
  assertDomId("SearchField.inputAttributes.id", inputId);
  const { onInput: attributeInput, ...nativeInputAttributes } = inputAttributes;
  const { onSubmit: attributeSubmit, ...formAttributes } = attributes;
  return q.form({
    ...formAttributes,
    id,
    role: "search",
    class: [
      { gluon: true, molecule: true, "gluon-search-field": true },
      attributes.class,
    ],
    "?aria-disabled": disabled || undefined,
    onSubmit: (event: SubmitEvent) => {
      callListener(attributeSubmit, event);
      if (!event.defaultPrevented) onSubmit?.(event);
    },
    children: [
      q.label({
        class: "gluon-search-field-label",
        for: inputId,
        children: label,
      }),
      q.div({
        class: "gluon-search-field-controls",
        children: [
          Input({
            value: query,
            type: "search",
            name,
            placeholder,
            disabled,
            onInput: (event) => {
              callListener(attributeInput, event);
              if (!event.defaultPrevented)
                onQueryChange?.(
                  (event.target as HTMLInputElement).value,
                  event,
                );
            },
            attributes: {
              ...nativeInputAttributes,
              id: inputId,
              "aria-busy": loading || undefined,
            },
          }),
          Button({
            type: "submit",
            label: submitLabel,
            disabled: disabled || loading,
            attributes: {
              ...submitAttributes,
              "aria-busy": loading || undefined,
            },
          }),
        ],
      }),
    ],
  });
}

function assertNonEmpty(name: string, value: string): void {
  if (value.trim().length === 0)
    throw new TypeError(`${name} must be a non-empty string.`);
}

function assertDomId(name: string, value: string): void {
  assertNonEmpty(name, value);
  if (/\s/u.test(value))
    throw new TypeError(`${name} must not contain whitespace.`);
}

function callListener<EventType extends Event>(
  listener:
    | ((event: EventType) => unknown)
    | { handleEvent(event: EventType): void }
    | null
    | undefined,
  event: EventType,
): void {
  if (typeof listener === "function") listener(event);
  else listener?.handleEvent(event);
}

export const SearchField = defineMolecule(renderSearchField, "SearchField", [
  searchFieldStyleDependency,
]);
