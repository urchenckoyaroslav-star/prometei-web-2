# PROMETEI WEB 2.0

**Live website:** https://urchenckoyaroslav-star.github.io/prometei-web-2/

A **real, responsive static website** for PROMETEI Messenger and related independent Android projects. Built from scratch with semantic HTML, custom CSS, accessible controls and vanilla JavaScript — no WordPress, account credentials or paid runtime required. A small build-time Node script prepares SEO metadata and localized static output for Cloudflare Pages.

## For international hiring teams

**Developer portfolio:** [Case studies and contact](https://prometei-web-2.pages.dev/portfolio) · [Project screenshots](https://prometei-web-2.pages.dev/portfolio#project-gallery)

[![PROMETEI WEB 2 homepage](assets/portfolio/web.webp)](https://prometei-web-2.pages.dev/portfolio#project-gallery)

Projects you can independently inspect:
- **PROMETEI Messenger:** published Android app on Google Play; Bluetooth, local Wi-Fi/LAN and Internet workflows — [store listing](https://play.google.com/store/apps/details?id=com.meshnetwork.app).
- **PHANTOM GPS:** Android test utility in Google Play **closed testing**, not public production — [tester opt-in](https://play.google.com/apps/testing/com.phantomgps.app).
- **PokoNap:** development-stage Android educational game, not public production.
- **PROMETEI WEB 2:** this seven-language responsive site, publicly deployed with source control and documented SEO/accessibility work.
- **PROMETEI FM:** [live radio website](https://prometei-web-2.pages.dev/fm), [55-track music chart](https://prometei-web-2.pages.dev/fm-charts) and [play history](https://prometei-web-2.pages.dev/fm-history).

Experience areas evidenced here: Android / Kotlin-oriented release workflows and device testing, Bluetooth/BLE and local network scenarios, Google Play testing, vanilla HTML/CSS/JavaScript, Cloudflare Pages Functions/Workers KV, responsive and multilingual UI.

No invented professional years, degrees, client metrics, security guarantees or claims that closed tests are production apps. The portfolio gallery includes published PROMETEI Google Play screenshots and captures of the live website and FM chart.

## Features

- Seven Google-crawlable home-page versions: English at `/`, Ukrainian `/uk/`, Russian `/ru/`, German `/de/`, Spanish `/es/`, Simplified Chinese `/zh/`, Japanese `/ja/`. HTML translations are pre-rendered (not only JS), with reciprocal `hreflang`, individual titles and canonical URLs.
- Responsive layouts for 320px phones, tablets and desktop; keyboard-friendly navigation and visible focus.
- Animated ambient particles, CSS device concept, interactive transport route explorer; `prefers-reduced-motion` honored.
- Project pages for PROMETEI, PHANTOM GPS (clearly marked closed testing), PokoNap (in development), and developer portfolio.
- Search-friendly network explainer at `/how-it-works.html` with limitations, plus public documentation pages: `/privacy.html`, `/account-deletion.html`, `/child-safety.html`, `/terms.html`, `/support.html`, `/privacy-phantom.html`, `/privacy-pokonap.html`.
- Public `app-ads.txt` for the publisher ID recorded in the project history. Re-verify publisher ID and confirm domain configuration in Google Play/AdMob.
- No app source code, signing material, GitHub access tokens, real-user data, analytics or contact secrets.

> **Important — legal review required:** The reconstructed privacy/deletion/safety documents are drafts based on available information, **not verified** against the latest production app SDKs, Play Data safety and backend retention rules. The exact app support/deletion request channel also needs confirmation. Do **not** update Play Console to these URLs until checked and publicly accessible. Legal detail text is currently English, with localized document titles and notices.

## Preview locally

From this folder:

```sh
python -m http.server 8080
```

Visit `http://localhost:8080`. This also works by opening `index.html` directly in a browser; legal pages do not require a build process. To regenerate SEO-readable legal pages after editing `generate_docs.py`, run `python generate_docs.py`.

## Hosting

**GitHub repository is the source of truth.** Cloudflare Pages can deploy the same design for free from `main`. To preview production output:

```sh
npm run build
python -m http.server 8080 --directory dist
```

For Cloudflare Pages: **Framework = None, Build command = `npm run build`, Build output = `dist`**. Then set `SITE_URL` to the exact confirmed Pages production URL and redeploy. Full owner-authorization and verification steps are in [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md).

GitHub Pages also works for source-controlled project pages where permitted by the [GitHub Pages acceptable-use limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). GitHub Pages is **not** intended as a free host for commercial SaaS or an online business. For commercial product presentation, prefer Cloudflare Pages.

## Before launch

1. Confirm the final public hostname, HTTPS, responsive checks and that `/app-ads.txt` returns plain text with HTTP 200.
2. Review every legal document against app code, Play Data safety, privacy policy, child-safety standards and purchase/AdMob configuration.
3. Provide a verified **non-public-support-personal-email alternative** for requests, including a direct external account-deletion request channel where required by Google Play.
4. Update developer website and legal URLs in Play Console **only after** checking all links.
5. Publish a `sitemap.xml` with the final canonical domain, add Search Console and submit for indexing.
6. Keep previous site suspension appeal active; do not claim old WordPress URLs will redirect.

Design assets are original SVG/CSS illustrations. The phone UI and decorative project art are **concepts, not screenshots**.

## Google Search readiness

- Each main language gets its own indexable HTML document, title, description, canonical, and reciprocal hreflang references.
- `sitemap.xml` and `robots.txt` are generated from the canonical production URL.
- `MobileApplication` JSON-LD lists only independently supported attributes, without invented star ratings or awards.
- 1200×630 Open Graph share image and accessible keyboard controls are included.
- Search Console property verification, indexing and ranking **cannot be guaranteed by source changes alone**; verified owner action is needed.
- Legal documents are still restoration drafts, not approved replacements for the actual Google Play policies.
