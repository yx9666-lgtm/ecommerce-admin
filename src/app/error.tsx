"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="text-6xl font-bold text-gold-500">500</div>
        <h2 className="text-xl font-semibold text-foreground">
          出错了
        </h2>
        <p className="text-muted-foreground max-w-md">
          页面加载时发生错误，请重试。如果问题持续存在，请联系管理员。
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center rounded-full px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-gold-500 to-gold-700 hover:from-gold-600 hover:to-gold-800 transition-all"
        >
          重试
        </button>
      </div>
    </div>
  );
}
