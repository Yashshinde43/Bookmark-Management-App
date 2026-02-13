"use client";

import { useEffect, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type Bookmark = {
  id: string;
  url: string;
  title: string;
  created_at: string;
  user_id: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BookmarkApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);
      setLoading(false);

      if (user) {
        await loadBookmarks(user.id);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void loadBookmarks(nextUser.id);
      } else {
        setBookmarks([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBookmarks((prev) => [...prev, payload.new as Bookmark]);
          } else if (payload.eventType === "UPDATE") {
            setBookmarks((prev) =>
              prev.map((b) => (b.id === payload.new.id ? (payload.new as Bookmark) : b)),
            );
          } else if (payload.eventType === "DELETE") {
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== (payload.old as Bookmark).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const loadBookmarks = async (userId: string) => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Failed to load bookmarks.");
      return;
    }

    setBookmarks(data ?? []);
  };

  const handleSignIn = async () => {
    setError(null);
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (error) {
      console.error(error);
      setError("Failed to sign in with Google.");
    }
  };

  const handleSignOut = async () => {
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      setError("Failed to sign out.");
    }
  };

  const handleAddBookmark = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !url.trim() || !title.trim()) return;

    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        url: url.trim(),
        title: title.trim(),
        user_id: user.id,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      console.error(error);
      setError("Failed to add bookmark.");
      return;
    }

    if (data) {
      setBookmarks((previous) => [data as Bookmark, ...previous]);
    }

    setUrl("");
    setTitle("");
  };

  const handleDeleteBookmark = async (id: string) => {
    if (!user) return;
    setError(null);

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setError("Failed to delete bookmark.");
      return;
    }

    setBookmarks((previous) => previous.filter((bookmark) => bookmark.id !== id));
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col justify-between gap-6 rounded-3xl border border-zinc-200/80 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
        <header className="flex items-center justify-between gap-3">
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Smart Bookmark App
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Your personal link hub
            </h1>
            <p className="max-w-md text-sm text-zinc-500">
              Sign in with Google and keep your bookmarks synced and private across
              devices.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-500 sm:flex">
            SB
          </div>
        </header>
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-2xl bg-zinc-100" />
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Preparing your workspace…</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-zinc-400" />
            Connecting to Supabase
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[320px] flex-col justify-between gap-8 rounded-3xl border border-zinc-200/80 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Smart Bookmark App
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              A cleaner home for your links
            </h1>
            <p className="max-w-md text-sm text-zinc-600">
              Sign in with Google to capture the articles, tools, and docs you care
              about. Everything is private to your account and updates in real time.
            </p>
          </div>
          <div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-700 text-lg font-semibold text-zinc-50 shadow-sm sm:flex">
            SB
          </div>
        </header>

        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-8 text-center">
          <p className="text-sm font-medium text-zinc-800">
            Sign in to start saving bookmarks
          </p>
          <p className="max-w-sm text-xs text-zinc-500">
            We use Supabase Auth with Google. No passwords, no public feed – just your
            own private bookmark space.
          </p>
          <button
            onClick={handleSignIn}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-zinc-900">
              G
            </span>
            Continue with Google
          </button>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        <footer className="flex items-center justify-between text-[11px] text-zinc-400">
          <span>Bookmarks stay private to your account.</span>
          <span>Powered by Next.js &amp; Supabase</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7 py-4 sm:py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Smart Bookmark App
          </p>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Your personal reading list
            </h1>
            <p className="max-w-md text-sm text-zinc-600">
              Capture links in seconds, keep them neatly organized, and watch changes
              sync across tabs in real time.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-900 to-zinc-700 text-xs font-semibold text-zinc-50">
            {user.email?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden text-left text-xs text-zinc-600 sm:block">
            <p className="font-medium text-zinc-800">Signed in</p>
            <p className="line-clamp-1">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-1 inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-6">
        <form
          onSubmit={handleAddBookmark}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              required
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="My favorite article"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-0 transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 sm:mt-6"
          >
            {submitting ? "Saving..." : "Add"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-700">Your bookmarks</h2>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
            {bookmarks.length} saved
          </span>
        </div>
        {bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-8 text-center text-sm text-zinc-500">
            <p className="mb-1 font-medium text-zinc-700">
              No bookmarks yet – you&apos;re all caught up.
            </p>
            <p className="text-xs text-zinc-500">
              Drop in the article, video, or doc you want to revisit and we&apos;ll keep
              it safe here.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {bookmarks.map((bookmark) => (
              <li
                key={bookmark.id}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
              >
                <div className="space-y-1">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noreferrer"
                    className="line-clamp-1 text-sm font-medium text-zinc-900 underline-offset-2 hover:underline"
                  >
                    {bookmark.title}
                  </a>
                  <p className="line-clamp-1 text-xs text-zinc-500">
                    {bookmark.url}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {new Date(bookmark.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => void handleDeleteBookmark(bookmark.id)}
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:border-red-100 hover:bg-red-50 hover:text-red-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <footer className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Only you can see these bookmarks.</span>
        <span>Changes appear instantly across open tabs.</span>
      </footer>
    </div>
  );
}

