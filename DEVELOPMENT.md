# SKUNKLA development workspace

This branch is for **unpublished design work**. The production website is deployed from `main`; do not merge this branch until the site owner explicitly approves publication.

## Available prototypes

- `prototypes/catalog-layout.html`: responsive, noncommercial visual grid. Includes 12 abstract design cards, category-style labels, and mobile layout rules.
- Existing informational pages and assets inherited from `main`.

## Reference layout checklist

The uploaded original-site HTML uses a compact product-card grid with square image areas, category sections, and responsive navigation. This prototype follows the **layout pattern only** and deliberately does not import merchandise data.

- [x] Desktop multi-column visual grid
- [x] Mobile two-column visual grid
- [x] Square artwork placeholders
- [x] Category-style navigation treatment
- [x] No pricing or sales actions
- [ ] Replace abstract placeholder artwork with approved, noncommercial brand assets
- [x] Add automated responsive tests at 375px, 768px, and 1440px (passing result not yet verified)
- [x] Add automated keyboard, label, logo, and reset checks (passing result not yet verified)
- [ ] Owner approval before any production deployment

## Deployment safety

Cloudflare Pages production is connected to `main`. Keep experimental files on `development/catalog-layout`. Do not change the production branch, domain settings, DNS, or payment integrations during design development.

## Checkout scope

No working cart, ordering, payment collection, or checkout flow is included. This branch is an informational visual-design workspace.

## Validation and review

GitHub Actions workflow: `.github/workflows/development-prototype-checks.yml`

- Python static audit: `python tests/check_catalog_prototype.py`
- Chromium interaction tests: `npx playwright test`
- Responsive screenshot widths: 375px, 768px, 1440px
- Screenshots and debugging traces are retained as GitHub Actions artifacts for seven days.
- Test definitions have been committed. **Do not describe the workflow as passing until its run shows success.**

The prototype includes category filters, a labeled text search, reset control, empty-results message, keyboard skip link, and a SKUNKLA logo asset. It is not an exact clone of the reference site.

## Handoff checklist

1. Open the latest GitHub Actions run on this branch and verify all checks are green.
2. Download `development-design-review` artifacts and visually inspect the three screen widths.
3. If tests fail, inspect `development-browser-debug` screenshots and traces, fix on this branch, and rerun.
4. Obtain approval for any replacement brand imagery and copy.
5. Keep the branch unpublished; do not merge to `main` without an explicit release request.

## Scope and limitations

This development deliverable is a **noncommercial visual prototype**, not a complete retail site. It does not contain cannabis/THC merchandise listings, prices, carts, payment collection, or working checkout. Production deployment and Cloudflare configuration have not been modified as part of this branch's work.
