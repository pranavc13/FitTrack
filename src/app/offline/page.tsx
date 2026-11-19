export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm space-y-3">
        <img src="/icons/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-2xl" />
        <h1 className="font-display text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted">Pages you&apos;ve opened before still work, and food, water, weight and activity you log are saved on this phone and synced when you reconnect. AI scanning needs internet.</p>
        <a href="/home" className="inline-flex h-11 items-center rounded-2xl bg-lime px-5 font-semibold text-lime-ink">Try again</a>
      </div>
    </main>
  );
}
