import { Card } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <div className="mt-5 space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="space-y-2">
                <div className="h-3 w-36 rounded bg-zinc-800" />
                <div className="h-3 w-52 rounded bg-zinc-800" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-zinc-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}
