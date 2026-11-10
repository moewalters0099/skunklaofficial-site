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
- [ ] Test responsive layout at narrow, medium, and wide screen sizes
- [ ] Review accessibility and keyboard navigation
- [ ] Owner approval before any production deployment

## Deployment safety

Cloudflare Pages production is connected to `main`. Keep experimental files on `development/catalog-layout`. Do not change the production branch, domain settings, DNS, or payment integrations during design development.

## Checkout scope

No working cart, ordering, payment collection, or checkout flow is included. This branch is an informational visual-design workspace.
