import { beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { Button, installUi } from "@gluonjs/atoms";
import { render, unmount } from "../src/index.js";
import { SearchField, SearchResults } from "@gluonjs/molecules";
import { q } from "@gluonjs/quarks";

beforeEach(() => {
  unmount(document.body);
  document.body.replaceChildren();
  document.adoptedStyleSheets = [];
});

describe("SearchField and SearchResults", () => {
  it("keeps native search semantics and controlled submission", async () => {
    const onQueryChange = vi.fn();
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const nativeInput = vi.fn();
    const nativeSubmit = vi.fn();
    const owner = installUi(document, { theme: "light" });
    render(
      SearchField({
        id: "product-search",
        label: "Search products",
        query: "cobalt",
        onQueryChange,
        onSubmit,
        submitLabel: "Find",
        inputAttributes: { onInput: { handleEvent: nativeInput } },
        attributes: { onSubmit: { handleEvent: nativeSubmit } },
      }),
      document.body,
    );

    const form = document.body.querySelector('form[role="search"]')!;
    const input = form.querySelector<HTMLInputElement>('input[type="search"]')!;
    const button = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;
    expect(form.querySelector("label")?.htmlFor).toBe(input.id);
    expect(input.value).toBe("cobalt");
    expect(input.disabled).toBe(false);
    expect(button.textContent).toContain("Find");
    await page.getByRole("search").getByRole("searchbox").fill("graphite");
    expect(nativeInput).toHaveBeenCalledOnce();
    expect(onQueryChange).toHaveBeenCalledWith(
      "graphite",
      expect.any(InputEvent),
    );
    await userEvent.keyboard("{Enter}");
    expect(nativeSubmit).toHaveBeenCalledOnce();
    await page
      .getByRole("search")
      .getByRole("button", { name: "Find" })
      .click();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect((await axe.run(document.body)).violations).toHaveLength(0);
    document.body.replaceChildren();
    render(
      SearchField({
        id: "loading-search",
        label: "Search",
        submitLabel: "Find",
        loading: true,
        disabled: true,
        submitAttributes: { "aria-label": "Submit product search" },
      }),
      document.body,
    );
    expect(document.querySelector("input")?.disabled).toBe(true);
    expect(document.querySelector("button")?.disabled).toBe(true);
    expect(document.querySelector("button")?.getAttribute("aria-label")).toBe(
      "Submit product search",
    );
    expect(document.querySelector("button")?.getAttribute("aria-busy")).toBe(
      "true",
    );
    expect((await axe.run(document.body)).violations).toHaveLength(0);
    owner.dispose();
  });

  it("renders grouped lists and every asynchronous state without owning data", async () => {
    const owner = installUi(document, { theme: "light" });
    render(
      SearchResults({
        id: "product-results",
        heading: "Results",
        groups: [
          {
            id: "products",
            heading: "Products",
            count: 1,
            description: "Catalog matches",
            children: q.li({
              children: q.a({
                href: "/products/cobalt",
                children: "Cobalt cable",
              }),
            }),
          },
        ],
      }),
      document.body,
    );
    expect(
      document.querySelectorAll(
        'section[aria-labelledby="product-results-products-heading"]',
      ),
    ).toHaveLength(1);
    expect(document.querySelector("ul > li a")?.getAttribute("href")).toBe(
      "/products/cobalt",
    );
    expect(
      document.querySelector(".gluon-search-results-count")?.textContent,
    ).toBe(" (1)");
    expect((await axe.run(document.body)).violations).toHaveLength(0);
    document.body.replaceChildren();
    render(
      SearchResults({
        id: "partial-results",
        state: "partial-failure",
        partialFailureContent: "Products unavailable",
        groups: [
          {
            id: "available",
            heading: "Available",
            count: 1,
            children: q.li({ children: "Still available" }),
          },
        ],
      }),
      document.body,
    );
    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      "Products unavailable",
    );
    expect(
      document.querySelector(".gluon-search-results-group")?.textContent,
    ).toContain("Still available");
    document.body.replaceChildren();
    render(
      SearchResults({ id: "disabled-results", state: "disabled" }),
      document.body,
    );
    expect(
      document
        .querySelector(".gluon-search-results")
        ?.getAttribute("aria-disabled"),
    ).toBe("true");
    expect(() =>
      SearchResults({
        id: "duplicate-results",
        groups: [
          { id: "same", heading: "One" },
          { id: "same", heading: "Two" },
        ],
      }),
    ).toThrow(/unique/);
    expect(() =>
      SearchResults({
        id: "empty-results",
        groups: [{ id: " ", heading: "Invalid" }],
      }),
    ).toThrow(/non-empty/);
    expect(() => SearchResults({ id: " ", heading: "Invalid" })).toThrow(
      /non-empty/,
    );
    expect(() =>
      SearchResults({ id: "invalid state", heading: "Invalid" }),
    ).toThrow(/whitespace/);
    expect(() =>
      SearchResults({ id: "invalid-state", state: "stale" as never }),
    ).toThrow(/SearchResults.state/);
    expect(() =>
      SearchResults({ id: "invalid-heading", headingLevel: 1 as never }),
    ).toThrow(/headingLevel/);
    expect(() =>
      SearchField({ id: "invalid-field", label: "Search", name: " " }),
    ).toThrow(/SearchField.name/);
    expect(() => SearchField({ id: "invalid field", label: "Search" })).toThrow(
      /whitespace/,
    );
    expect(() =>
      SearchField({
        id: "invalid-input",
        label: "Search",
        inputAttributes: { id: "invalid input" },
      }),
    ).toThrow(/whitespace/);
    document.body.replaceChildren();
    render(
      q.div({
        children: [
          SearchResults({
            id: "catalog-results",
            groups: [{ id: "products", heading: "Catalog products" }],
          }),
          SearchResults({
            id: "article-results",
            groups: [{ id: "products", heading: "Articles" }],
          }),
        ],
      }),
      document.body,
    );
    const groupHeadingIds = [
      ...document.querySelectorAll<HTMLElement>(
        ".gluon-search-results-group-heading",
      ),
    ].map((element) => element.id);
    expect(groupHeadingIds).toEqual([
      "catalog-results-products-heading",
      "article-results-products-heading",
    ]);
    expect(new Set(groupHeadingIds).size).toBe(groupHeadingIds.length);
    for (const section of document.querySelectorAll("section")) {
      expect(
        document.getElementById(section.getAttribute("aria-labelledby")!),
      ).toBeTruthy();
    }
    for (const state of [
      "loading",
      "empty",
      "partial-failure",
      "disabled",
    ] as const) {
      document.body.replaceChildren();
      render(
        SearchResults({ id: `product-results-${state}`, state }),
        document.body,
      );
      expect(
        document.querySelector(`.gluon-search-results.is-${state}`),
      ).toBeTruthy();
      expect(
        document.querySelector(".gluon-search-results-state")?.textContent,
      ).toBeTruthy();
    }
    owner.dispose();
  });
});
