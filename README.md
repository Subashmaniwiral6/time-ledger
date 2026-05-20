# Time Ledger

A calm, paper-feeling time tracker. Your entries are saved to your browser's `localStorage` — single-device, single-browser, no servers, no signup.

## Quick deploy (no local setup needed)

The fastest path is **GitHub → Vercel**, takes about 10 minutes:

1. **Create a new GitHub repo.** Go to <https://github.com/new>, name it `time-ledger`, leave it empty (no README, no .gitignore).

2. **Upload these files.** On the new empty repo page, click **"uploading an existing file"**. Drag this entire project folder in. Commit.

3. **Deploy on Vercel.** Go to <https://vercel.com/new>, sign in with GitHub, pick the `time-ledger` repo, click **Deploy**. Vercel detects Vite automatically — no config needed.

You'll get a URL like `time-ledger-yourname.vercel.app` in about 60 seconds. Every push to GitHub auto-redeploys.

## Local development

If you'd rather run it locally first:

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. Edits hot-reload.

To build for production locally:

```bash
npm run build      # creates dist/
npm run preview    # serves the built site at localhost:4173
```

## Data, privacy, sync

- **Where your data lives:** `localStorage`, scoped to the domain. If you deploy to `time-ledger.vercel.app`, the data lives there in your browser only.
- **No multi-device sync.** Phone and laptop will have separate ledgers.
- **No accounts, no servers.** This is a purely client-side app.

### If you want multi-device sync later

You'd need to replace the four storage helpers at the top of `src/App.jsx` (`loadKey`, `saveKey`, `deleteKey`, and the matching calls) with calls to a backend. Easiest options:

- **Supabase** — free tier, drop-in replacement, ~20 lines of changes; gives you auth and a real database
- **Firebase Firestore** — similar story
- **Cloudflare Workers + KV** — cheap and fast if you want minimal infra

The storage keys are already structured as `tl:entries:YYYY-MM-DD`, `tl:settings`, `tl:active`, which maps cleanly to any key-value or document store.

## Custom domain

In Vercel project settings → Domains, add your domain. Update DNS as Vercel instructs. HTTPS is automatic.

## Tech

Vite + React 18 + Tailwind v3 + lucide-react. Single-file component in `src/App.jsx`.
