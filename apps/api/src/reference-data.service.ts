import { Injectable } from '@nestjs/common';
import { asc, categories, districts, eq, provinces } from '@zed360/database';
import { DatabaseService } from './database.service';

function groupBy<T, K>(items: T[], getKey: (item: T) => K) {
  const grouped = new Map<K, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }
  return grouped;
}

@Injectable()
export class ReferenceDataService {
  constructor(private readonly database: DatabaseService) {}

  async getAll() {
    const [provinceRows, districtRows, categoryRows] = await Promise.all([
      this.database.db
        .select({
          id: provinces.id,
          name: provinces.name,
          slug: provinces.slug,
        })
        .from(provinces)
        .orderBy(asc(provinces.name)),
      this.database.db
        .select({
          id: districts.id,
          provinceId: districts.provinceId,
          name: districts.name,
          slug: districts.slug,
        })
        .from(districts)
        .orderBy(asc(districts.name)),
      this.database.db
        .select({
          id: categories.id,
          parentId: categories.parentId,
          name: categories.name,
          slug: categories.slug,
          sortOrder: categories.sortOrder,
        })
        .from(categories)
        .where(eq(categories.isActive, true))
        .orderBy(asc(categories.sortOrder), asc(categories.name)),
    ]);

    const districtsByProvince = groupBy(
      districtRows,
      (district) => district.provinceId,
    );
    const childrenByParent = groupBy(
      categoryRows.filter((category) => category.parentId !== null),
      (category) => category.parentId!,
    );

    return {
      provinces: provinceRows.map((province) => ({
        ...province,
        districts: (districtsByProvince.get(province.id) ?? []).map(
          ({ id, name, slug }) => ({ id, name, slug }),
        ),
      })),
      categories: categoryRows
        .filter((category) => category.parentId === null)
        .map(({ id, name, slug }) => ({
          id,
          name,
          slug,
          children: (childrenByParent.get(id) ?? []).map(
            ({ id: childId, name: childName, slug: childSlug }) => ({
              id: childId,
              name: childName,
              slug: childSlug,
            }),
          ),
        })),
    };
  }
}
