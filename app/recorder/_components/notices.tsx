"use client";

interface NoticesProps {
  error: string | null;
  notices: string[];
}

export function Notices({ error, notices }: NoticesProps) {
  if (!error && notices.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {notices.map((notice) => (
        <p
          key={notice}
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        >
          {notice}
        </p>
      ))}
    </div>
  );
}
