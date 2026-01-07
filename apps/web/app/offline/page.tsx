export default function Offline() {
  return (
    <main className="min-h-[calc(100vh-3rem)] grid place-items-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2">You’re offline</h1>
        <p className="text-neutral-600 dark:text-neutral-400">Some features are unavailable. We’ll retry when you’re back online.</p>
      </div>
    </main>
  );
}
