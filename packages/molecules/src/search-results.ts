import {
  defineMolecule,
  type TemplateResult,
  type TemplateValue,
} from "@gluonjs/core";
import { q, type QuarkProps } from "@gluonjs/quarks";
import { searchResultsStyleDependency } from "./search-results-styles.js";

export type SearchResultsState =
  "ready" | "loading" | "empty" | "partial-failure" | "disabled";
export type SearchResultsHeadingLevel = 2 | 3 | 4 | 5 | 6;
export type SearchResultsAttributes = Omit<
  QuarkProps<HTMLDivElement>,
  "children" | "role" | ".role" | "aria"
> & {
  readonly aria?: Omit<
    NonNullable<QuarkProps<HTMLDivElement>["aria"]>,
    "label" | "labelledby"
  >;
};
export interface SearchResultGroup {
  readonly id: string;
  readonly heading: TemplateValue;
  readonly count?: number | string;
  readonly description?: TemplateValue;
  readonly children?: TemplateValue;
}
export interface SearchResultsProps {
  readonly id: string;
  readonly groups?: readonly SearchResultGroup[];
  readonly state?: SearchResultsState;
  readonly heading?: TemplateValue;
  readonly headingLevel?: SearchResultsHeadingLevel;
  readonly loadingContent?: TemplateValue;
  readonly emptyContent?: TemplateValue;
  readonly partialFailureContent?: TemplateValue;
  readonly disabledContent?: TemplateValue;
  readonly attributes?: SearchResultsAttributes;
}

function renderSearchResults({
  id,
  groups = [],
  state = "ready",
  heading,
  headingLevel = 2,
  loadingContent = "Loading results…",
  emptyContent = "No results found.",
  partialFailureContent = "Some results could not be loaded.",
  disabledContent = "Search is unavailable.",
  attributes = {},
}: SearchResultsProps): TemplateResult {
  assertDomId("SearchResults.id", id);
  assertState(state);
  assertHeadingLevel(headingLevel);
  const seenGroupIds = new Set<string>();
  for (const group of groups) {
    assertDomId("SearchResultGroup.id", group.id);
    if (seenGroupIds.has(group.id))
      throw new TypeError(`SearchResultGroup.id must be unique: ${group.id}`);
    seenGroupIds.add(group.id);
  }
  const { aria, ...nativeAttributes } = attributes;
  const headingId = heading === undefined ? undefined : `${id}-heading`;
  const title =
    heading === undefined
      ? undefined
      : q.div({
          id: headingId,
          class: "gluon-search-results-heading",
          role: "heading",
          aria: { level: headingLevel },
          children: heading,
        });
  const status =
    (state === "ready" || state === "partial-failure") && groups.length > 0
      ? groups.map((group) => {
          const groupHeadingId = `${id}-${group.id}-heading`;
          return q.section({
            class: "gluon-search-results-group",
            aria: { labelledby: groupHeadingId },
            children: [
              q.div({
                id: groupHeadingId,
                class: "gluon-search-results-group-heading",
                role: "heading",
                aria: { level: Math.min(6, headingLevel + 1) },
                children: [
                  group.heading,
                  group.count === undefined
                    ? undefined
                    : q.span({
                        class: "gluon-search-results-count",
                        children: ` (${group.count})`,
                      }),
                ],
              }),
              group.description === undefined
                ? undefined
                : q.p({
                    class: "gluon-search-results-description",
                    children: group.description,
                  }),
              q.ul({
                class: "gluon-search-results-list",
                children: group.children,
              }),
            ],
          });
        })
      : undefined;
  const stateMessage =
    state === "loading"
      ? loadingContent
      : state === "empty"
        ? emptyContent
        : state === "partial-failure"
          ? partialFailureContent
          : state === "disabled"
            ? disabledContent
            : undefined;
  const message =
    stateMessage === undefined
      ? undefined
      : q.div({
          class: "gluon-search-results-state",
          role: "status",
          aria: { live: "polite", atomic: true },
          children: stateMessage,
        });
  return q.div({
    ...nativeAttributes,
    id,
    role: headingId === undefined ? undefined : "region",
    class: [
      {
        gluon: true,
        molecule: true,
        "gluon-search-results": true,
        [`is-${state}`]: true,
      },
      attributes.class,
    ],
    data: { ...attributes.data, state },
    aria: {
      ...aria,
      labelledby: headingId,
      disabled: state === "disabled" || undefined,
    },
    children: [title, status, message],
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

function assertState(state: SearchResultsState): void {
  if (
    !["ready", "loading", "empty", "partial-failure", "disabled"].includes(
      state,
    )
  ) {
    throw new TypeError(
      `SearchResults.state must be ready, loading, empty, partial-failure, or disabled; received ${String(state)}.`,
    );
  }
}

function assertHeadingLevel(level: SearchResultsHeadingLevel): void {
  if (!Number.isInteger(level) || level < 2 || level > 6) {
    throw new TypeError(
      `SearchResults.headingLevel must be an integer from 2 through 6; received ${String(level)}.`,
    );
  }
}

export const SearchResults = defineMolecule(
  renderSearchResults,
  "SearchResults",
  [searchResultsStyleDependency],
);
