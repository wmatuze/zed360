# Reference data policy

Zed360 treats administrative geography as sourced reference data. It must not be
added from memory or generated without a verifiable source.

## Zambia provinces and districts

- Primary source: Zambia Statistics Agency, _Revised 2022 Census of Population
  and Housing Summary Report Volume II_, Table 5.2.
- Source URL:
  https://www.zamstats.gov.zm/Publications/Revised%202022%20Census%20of%20Population%20and%20Housing%20Summary%20Report%20Volume%20II.pdf
- Cross-check: Ministry of Local Government and Rural Development, _Zambia
  Devolution Support Program ESMP_, which states that Zambia has 116 districts.
- Cross-check URL:
  https://www.mlgrd.gov.zm/wp-content/uploads/2025/01/Environmental-and-Social-Management-Plan-ESMP-Zambia-Devolution-Support-Program.pdf
- Last checked: 2026-08-07.
- Seeded scope: 10 provinces and 116 districts.
- Not seeded: district-centre coordinates. The database columns remain null until
  an authoritative GIS dataset can be obtained and its coordinate reference
  system verified.

The ZamStats PDF reverses the visual text extraction order for three district
rows: Kawambwa, Namwala, and Mwandi. Their placement was verified from the table
sequence and province totals rather than inferred from the extracted word order.

## Business categories

PACRA states that registered Zambian businesses are classified using the
International Standard Industrial Classification (ISIC). ZamStats also uses ISIC
Rev. 4 for the Economic Establishment Census.

- PACRA source: https://pacra.org.zm/classifications
- ZamStats source:
  https://www.zamstats.gov.zm/wp-content/uploads/2026/03/2025-EEC-DISSEMINATION-AND-GDP_REBASING_PROJECT_23032026.pdf
- Product input: `Zed360_Survey_Responses_Page_Values_2026-08-06.csv`.

The top-level Zed360 taxonomy is an ISIC-informed, user-facing product taxonomy;
it is not presented as an official government classification. Initial
subcategories reflect needs observed in the launch survey and remain editable.

## Running the seed

After migrations have been applied:

```powershell
pnpm.cmd db:seed
```

The seed is idempotent: rerunning it updates the managed reference rows without
creating duplicates.
