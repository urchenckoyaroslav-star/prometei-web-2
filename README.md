# PROMETEI WEB 2.0

A **real, responsive static website** for PROMETEI Messenger and related independent Android projects. Built from scratch with semantic HTML, custom CSS, accessible controls and vanilla JavaScript — no WordPress, Node build process, account credentials or paid runtime required.

## Features

- Seven main-site languages: English, Ukrainian, Russian, German, Spanish, Simplified Chinese and Japanese. Language preference is stored locally in the browser (only a local setting).
- Responsive layouts for 320px phones, tablets and desktop; keyboard-friendly navigation and visible focus.
- Animated ambient particles, CSS device concept, interactive transport route explorer; `prefers-reduced-motion` honored.
- Project pages for PROMETEI, PHANTOM GPS (clearly marked closed testing), PokoNap (in development), and developer portfolio.
- Public documentation pages: `/privacy.html`, `/account-deletion.html`, `/child-safety.html`, `/terms.html`, `/support.html`, `/privacy-phantom.html`, `/privacy-pokonap.html`.
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

**GitHub repository is the source of truth.** To host the static site, use Cloudflare Pages (recommended for a product marketing site with links to an Android app). Connect this GitHub repository in Cloudflare Pages, use Framework preset **None**, no build command, and output directory **/** (repository root) if supported. If a build command is mandatory, use `echo static site` and output `.`.

GitHub Pages also works for source-controlled project pages where permitted by the [GitHub Pages acceptable-use limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). GitHub Pages is **not** intended as a free host for commercial SaaS or an online business. For commercial product presentation, prefer Cloudflare Pages.

## Before launch

1. Confirm the final public hostname, HTTPS, responsive checks and that `/app-ads.txt` returns plain text with HTTP 200.
2. Review every legal document against app code, Play Data safety, privacy policy, child-safety standards and purchase/AdMob configuration.
3. Provide a verified **non-public-support-personal-email alternative** for requests, including a direct external account-deletion request channel where required by Google Play.
4. Update developer website and legal URLs in Play Console **only after** checking all links.
5. Publish a `sitemap.xml` with the final canonical domain, add Search Console and submit for indexing.
6. Keep previous site suspension appeal active; do not claim old WordPress URLs will redirect.

Design assets are original SVG/CSS illustrations. The phone UI and decorative project art are **concepts, not screenshots**.
