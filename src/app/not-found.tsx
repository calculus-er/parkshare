import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] p-7 text-center">
        <h1 className="text-white text-2xl font-light mb-2">Page not found</h1>
        <p className="text-white/35 text-sm mb-5">
          The page you are looking for does not exist or may have moved.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 border border-white/20 text-white text-xs tracking-wider uppercase hover:bg-white hover:text-black transition-all"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
