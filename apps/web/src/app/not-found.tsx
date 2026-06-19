import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold mb-2">Not Found</h2>
      <p className="text-gray-500 mb-6">This run does not exist.</p>
      <Link href="/" className="text-blue-400 hover:text-blue-300">
        ← Back to runs
      </Link>
    </div>
  );
}
