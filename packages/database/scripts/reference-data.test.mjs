import assert from "node:assert/strict";
import test from "node:test";
import {
  categories,
  launchSubcategories,
  provincesWithDistricts,
  toSlug,
} from "./reference-data.mjs";

test("contains Zambia's verified province and district totals", () => {
  assert.equal(provincesWithDistricts.length, 10);
  assert.equal(
    provincesWithDistricts.reduce(
      (total, province) => total + province.districts.length,
      0,
    ),
    116,
  );
});

test("province and district slugs are unique within their database constraints", () => {
  const provinceSlugs = provincesWithDistricts.map((province) => province.slug);
  assert.equal(new Set(provinceSlugs).size, provinceSlugs.length);

  for (const province of provincesWithDistricts) {
    const districtSlugs = province.districts.map(toSlug);
    assert.equal(
      new Set(districtSlugs).size,
      districtSlugs.length,
      `Duplicate district slug in ${province.name}`,
    );
  }
});

test("launch subcategories all reference known parents", () => {
  const parentSlugs = new Set(categories.map((category) => category.slug));
  for (const category of launchSubcategories) {
    assert.ok(
      parentSlugs.has(category.parentSlug),
      `Unknown parent ${category.parentSlug}`,
    );
  }
});

test("all category slugs are globally unique", () => {
  const slugs = [...categories, ...launchSubcategories].map(
    (category) => category.slug,
  );
  assert.equal(new Set(slugs).size, slugs.length);
});
