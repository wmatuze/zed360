export default function BusinessesLoading() {
  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="h-10 w-40 rounded-xl bg-white/8" />
        <div className="mt-20 h-14 max-w-xl rounded-2xl bg-white/8" />
        <div className="mt-10 h-32 rounded-3xl bg-white/6" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div className="h-64 rounded-3xl bg-white/6" key={item} />
          ))}
        </div>
      </div>
    </main>
  );
}
