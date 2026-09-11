import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FocusStats } from "@/lib/focus-stats";

type Props = {
  stats: FocusStats | null;
};

export function FocusStatsCards({ stats }: Props) {
  const items = [
    { label: "Sessions completed", value: stats?.totalSessions },
    { label: "Minutes focused", value: stats?.totalMinutes },
    { label: "Sessions this week", value: stats?.sessionsThisWeek },
  ];

  return (
    <div className="grid w-full gap-5 sm:grid-cols-3">
      {items.map(({ label, value }) => (
        <Card key={label} className="flex flex-col gap-2 p-6">
          <CardDescription>{label}</CardDescription>
          {value === undefined ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <CardTitle className="text-4xl">{value}</CardTitle>
          )}
        </Card>
      ))}
    </div>
  );
}
