export type DirectoryFilters = {
  q?: string;
  category?: string;
  province?: string;
  district?: string;
  fulfillment?: string;
  sort?: string;
  open?: string;
  available?: string;
  page?: string;
};

type FilterName = Exclude<keyof DirectoryFilters, "page">;

/** A directory address for these filters. Page 1 and empty values are left out. */
export function directoryHref(filters: DirectoryFilters, page = 1) {
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value && name !== "page") parameters.set(name, value);
  }
  if (page > 1) parameters.set("page", String(page));
  const query = parameters.toString();
  return query ? `/businesses?${query}` : "/businesses";
}

export type FilterChip = { name: FilterName; label: string; href: string };

/**
 * One removable chip per active filter. Removing a filter returns to page 1,
 * and removing a province also removes the district inside it.
 */
export function filterChips(
  filters: DirectoryFilters,
  labels: Partial<Record<FilterName, string | undefined>>,
): FilterChip[] {
  const order: FilterName[] = [
    "q",
    "province",
    "district",
    "category",
    "fulfillment",
    "open",
    "available",
    "sort",
  ];
  return order
    .filter((name) => filters[name])
    .map((name) => {
      const remaining = { ...filters, [name]: undefined };
      if (name === "province") remaining.district = undefined;
      return {
        name,
        label: labels[name] ?? String(filters[name]),
        href: directoryHref(remaining),
      };
    });
}

/**
 * Page numbers to show: the first, the last, and those around the current
 * page, with "gap" where pages are skipped.
 */
export function pageNumbers(current: number, total: number) {
  const wanted = new Set(
    [1, total, current - 1, current, current + 1].filter(
      (page) => page >= 1 && page <= total,
    ),
  );
  const pages: Array<number | "gap"> = [];
  let previous = 0;
  for (const page of [...wanted].sort((a, b) => a - b)) {
    // A single skipped page is shown rather than replaced by a gap.
    if (page - previous === 2) pages.push(previous + 1);
    else if (page - previous > 2) pages.push("gap");
    pages.push(page);
    previous = page;
  }
  return pages;
}
