### Smart Bookmark App

Small side project to keep my links in one place.  
Built with Next.js (App Router), Supabase, TypeScript and a light Tailwind 4 setup.

### What it does

- Login with Google – no password flow, just OAuth.
- Add a bookmark – URL + short title.
- Per‑user privacy – each user only sees their own data.
- Realtime updates – open two tabs and you’ll see new items pop in.
- Delete** bookmarks you no longer care about.

### Running the app locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root (copy `.env.example`) and fill in your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Start the dev server:

```bash
npm run dev
```


### Supabase setup (once per project)

I used a single table called `bookmarks`. SQL used during setup:

Other bits I flipped on in the dashboard:

- Auth → Providers → Google: enabled Google, set redirect URL to `http://localhost:3000` for local dev.
- Database → Replication → Realtime: turned on Realtime for the `bookmarks` table.

### Deploying

The app is meant to be deployed on Vercel:

1. Push this repo to GitHub.
2. Create a new project on Vercel, pointing at the repo.
3. In Vercel project settings, add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Trigger a deploy. The Vercel URL is the one to share.

### Notes

- If sign‑in completes but you still appear logged out, check the redirect URL in the Google provider settings.
- If bookmarks don’t sync across tabs, Realtime is probably not enabled for the table.
- Secrets (Supabase keys etc.) should live only in `.env.local` / Vercel env vars, not in the repo.
