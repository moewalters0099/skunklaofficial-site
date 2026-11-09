# Static deployment notes

This repository contains a neutral, non-transactional temporary landing page.

## Local preview
Open `index.html` in a browser. No build tools are needed.

## Cloudflare Pages (manual setup)
1. Sign in to Cloudflare and select Workers & Pages.
2. Create a Pages project using the GitHub repository.
3. Select a static deployment: production branch `main`, no build command, output directory `/`.
4. Preview the temporary site on the generated pages.dev URL.
5. Only after the preview is approved, add the custom domain in Cloudflare Pages.
6. Follow Cloudflare's displayed DNS instructions for the actual account setup. Do not replace DNS records blindly.
7. Confirm HTTPS and test the domain.

## Before a public launch
- Replace this placeholder with approved site content.
- Remove `noindex` and the blocking `robots.txt` only when appropriate.
- Test mobile layout, accessibility, metadata, links, and security.
- Keep domain registration and account recovery under the owner's control.
- Never commit credentials, API keys, or private customer data.
