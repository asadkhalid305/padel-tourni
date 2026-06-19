# Padel Tourni Branding

The product display name is **Padel Tourni** and the tagline is **Fair draws. Better games.** The court mark, favicon, install icon, and social preview use the existing deep green and warm lime palette.

## Repository Assets

- `src/components/brand-logo.tsx`: shared app-shell wordmark and court mark
- `src/app/icon.svg`: scalable browser favicon
- `src/app/apple-icon.tsx`: generated Apple touch icon
- `src/app/opengraph-image.tsx`: generated Open Graph and social preview
- `src/app/manifest.ts`: install metadata and theme colors

## External Settings

These settings are not controlled by repository code and should be changed only when the new branding is approved:

- Vercel: rename the project display name to `padel-tourni`; review the generated domain before changing production aliases.
- Supabase: rename the hosted project display name to `Padel Tourni`. Do not change the project reference or API URL.
- Google Cloud: rename the OAuth consent-screen app to `Padel Tourni` and upload the square court mark. Existing client IDs and redirect URIs should remain unchanged.
- GitHub: optionally rename the repository and update the README link after confirming redirects and integrations.
- Domain and social profiles: update display names and preview caches after the new deployment is live.
