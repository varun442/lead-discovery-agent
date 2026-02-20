import { Header } from "@/components/header";
import { Card } from "@/components/ui/card";

function SkeletonLine({ className }: { className: string }) {
  return <div className={`rounded bg-zinc-800 ${className}`} />;
}

export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-hero-gradient">
      <Header />

      <section className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8 sm:px-6">
        <div className="mb-6 animate-pulse space-y-2">
          <SkeletonLine className="h-9 w-52" />
          <SkeletonLine className="h-4 w-80" />
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl p-5">
            <div className="flex items-start gap-3 animate-pulse">
              <div className="h-9 w-9 rounded-lg bg-zinc-800" />
              <div className="space-y-2">
                <SkeletonLine className="h-3 w-20" />
                <SkeletonLine className="h-5 w-36" />
                <SkeletonLine className="h-3 w-48" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 animate-pulse">
              <div className="h-4 w-4 rounded bg-zinc-800" />
              <SkeletonLine className="h-5 w-20" />
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-black/30 p-4">
              <div className="space-y-2 animate-pulse">
                <SkeletonLine className="h-4 w-1/3" />
                <SkeletonLine className="h-3 w-2/3" />
                <SkeletonLine className="h-3 w-1/4" />
              </div>
            </div>
            <div className="mt-4 animate-pulse space-y-3">
              <SkeletonLine className="h-3 w-44" />
              <div className="flex flex-col gap-3 sm:flex-row">
                <SkeletonLine className="h-10 w-full" />
                <SkeletonLine className="h-10 w-44" />
              </div>
              <SkeletonLine className="h-3 w-56" />
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <div className="animate-pulse space-y-2">
              <SkeletonLine className="h-5 w-32" />
              <SkeletonLine className="h-4 w-72" />
              <SkeletonLine className="h-4 w-3/4" />
              <SkeletonLine className="h-8 w-44" />
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
