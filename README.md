# ASC Page Editor

Web editor for App Store Connect metadata with **all locales editable at once**, current values visible, and diff for text and screenshots.

## Features

- Ant Design UI (English)
- App Store Connect API key (Issuer ID, Key ID, `.p8` private key) — stored in `localStorage`
- App and version picker
- View and edit:
  - **App Store Version** — description, keywords, What's New, promotional text, URLs
  - **App Info** — name, subtitle, privacy policy
- Side-by-side text diff before save
- Screenshots per locale: upload, delete, replace, reorder (drag-and-drop)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For access from another device on your LAN, use the Network URL from the terminal. If HMR fails, add the host IP via `ALLOWED_DEV_ORIGINS` in `.env.local` (comma-separated) — see `next.config.ts`.

## API key

1. [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → Integrations → **App Store Connect API**
2. Create a key with **Admin** or **App Manager** role
3. Download `.p8` and paste **Issuer ID**, **Key ID**, and key contents into the app

Requests go through `/api/asc/*`, which signs a JWT (ES256) and calls `https://api.appstoreconnect.apple.com/v1`.

## Security

Credentials stay in the browser and are sent to your Next.js server in headers for signing. Do not expose a public deployment without extra protection (e.g. Vercel Deployment Protection).

## Screenshots

On the **Screenshots** tab, per locale and device size:

- **Add** — PNG/JPEG per [Apple specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- **Replace** — delete current frame and upload a new one
- **Delete** — App Store Connect API `DELETE`
- **Order** — drag previews (saved via API)
- **Create set** — when a locale has no slot for that device size yet

Uploads use `/api/asc/screenshot-upload` (reserve → S3 → commit).

## Limits

- Up to 10 screenshots per set (ASC limit)
- Editing only when the version is in a suitable state (e.g. `PREPARE_FOR_SUBMISSION`)
- `APP_IPHONE_69` may not be accepted by the API; use `APP_IPHONE_67` (6.7") when creating sets

## Deploy on Vercel

Standard Next.js app — **no server-side ASC secrets**; the key is still entered in the browser.

### Quick start

1. Push the repo to GitHub/GitLab/Bitbucket.
2. [Import on Vercel](https://vercel.com/new) (Framework: **Next.js**).
3. Build: `npm run build`, output: automatic.
4. Deploy.

Or with [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

### Environment variables

Not required on Vercel. Optional for local dev:

| Variable | Where | Purpose |
|----------|-------|---------|
| `ALLOWED_DEV_ORIGINS` | `.env.local` | Extra HMR hosts in `next.config.ts`, comma-separated |

### API routes on Vercel

- `/api/asc/*` — proxy to App Store Connect (JWT on server)
- `/api/asc/screenshot-upload` — screenshot upload (up to **60s**, `vercel.json` + `maxDuration`)

On Hobby, request body limit is ~**4.5 MB**; large PNGs may fail — compress or use Pro.

### Production security

A public URL lets anyone open the UI and send **their own** API key through your proxy. Recommended:

- Enable **[Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection)** (password / Vercel Auth) for Preview and Production
- Do not store `.p8` in Vercel env vars or commit keys
- Use minimal ASC key role (App Manager)

### Pre-deploy check

```bash
npm run build
```
