"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FocusStatsCards } from "@/components/focus-stats-cards";
import { useFocusStats } from "@/hooks/useFocusStats";

export default function StatisticsPage() {
  const router = useRouter();
  const { stats, error } = useFocusStats();

  return (
    <div className="bg-canvas flex h-screen w-screen flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-ink text-2xl font-bold">Statistics</h2>
        <Button
          variant="outline"
          className="border-hairline text-ink hover:bg-ink/5 hover:text-ink rounded-full bg-transparent font-semibold"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <FocusStatsCards stats={stats} />
    </div>
  );
}
