import BookmarkApp from "@/components/BookmarkApp";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-8 font-sans">
      <main className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
        <BookmarkApp />
      </main>
    </div>
  );
}
