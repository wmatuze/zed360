import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import {
  categories,
  launchSubcategories,
  provincesWithDistricts,
  referenceDataMetadata,
  toSlug,
} from "./reference-data.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "../../..");

config({ path: resolve(projectRoot, ".env"), quiet: true });

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, {
  connect_timeout: 15,
  max: 1,
  prepare: false,
});

try {
  await sql.begin(async (transaction) => {
    const provinceRows = provincesWithDistricts.map(({ name, slug }) => ({
      name,
      slug,
    }));

    await transaction`
      insert into provinces ${transaction(provinceRows, "name", "slug")}
      on conflict (slug) do update set name = excluded.name
    `;

    const savedProvinces = await transaction`select id, slug from provinces`;
    const provinceIds = new Map(
      savedProvinces.map((province) => [province.slug, province.id]),
    );
    const districtRows = provincesWithDistricts.flatMap((province) => {
      const provinceId = provinceIds.get(province.slug);
      if (!provinceId) {
        throw new Error(`Missing seeded province: ${province.slug}`);
      }

      return province.districts.map((districtName) => ({
        province_id: provinceId,
        name: districtName,
        slug: toSlug(districtName),
      }));
    });

    await transaction`
      insert into districts ${transaction(
        districtRows,
        "province_id",
        "name",
        "slug",
      )}
      on conflict (province_id, slug) do update set name = excluded.name
    `;

    const categoryRows = categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      description: "Top-level Zed360 category informed by ISIC Rev. 4.",
      sort_order: category.sortOrder,
    }));

    await transaction`
      insert into categories ${transaction(
        categoryRows,
        "name",
        "slug",
        "description",
        "sort_order",
      )}
      on conflict (slug) do update set
        name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order,
        is_active = true
    `;

    const savedCategories = await transaction`select id, slug from categories`;
    const categoryIds = new Map(
      savedCategories.map((category) => [category.slug, category.id]),
    );
    const subcategoryRows = launchSubcategories.map((category) => {
      const parentId = categoryIds.get(category.parentSlug);
      if (!parentId) {
        throw new Error(`Missing category parent: ${category.parentSlug}`);
      }

      return {
        parent_id: parentId,
        name: category.name,
        slug: category.slug,
        description:
          "Initial user-facing subcategory prioritised from Zed360 survey responses.",
        sort_order: category.sortOrder,
      };
    });

    await transaction`
      insert into categories ${transaction(
        subcategoryRows,
        "parent_id",
        "name",
        "slug",
        "description",
        "sort_order",
      )}
      on conflict (slug) do update set
        parent_id = excluded.parent_id,
        name = excluded.name,
        description = excluded.description,
        sort_order = excluded.sort_order,
        is_active = true
    `;
  });

  const [counts] = await sql`
    select
      (select count(*)::integer from provinces) as provinces,
      (select count(*)::integer from districts) as districts,
      (select count(*)::integer from categories) as categories
  `;

  console.log("Reference data seed: successful");
  console.log(`Provinces: ${counts.provinces}`);
  console.log(`Districts: ${counts.districts}`);
  console.log(`Categories: ${counts.categories}`);
  console.log(`Geography checked: ${referenceDataMetadata.checkedOn}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Reference data seed failed: ${message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
