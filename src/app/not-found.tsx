import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="text-6xl font-bold text-amber-500">404</div>
        <h2 className="text-xl font-semibold text-foreground">
          页面未找到
        </h2>
        <p className="text-muted-foreground max-w-md">
          您访问的页面不存在或已被移除。
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-full px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
