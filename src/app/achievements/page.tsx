"use client";
import { Button } from "@/components/ui/button";
import milestones from "../../../public/achievements/milestones/file.json";
import { useRouter } from "next/navigation";
import { RWebShare } from "react-web-share";
import { AnimatePresence, motion } from "framer-motion";
import { useFocusStats } from "@/hooks/useFocusStats";
import {
  MilestoneCard,
  rarityForSessionCount,
} from "@/components/milestone-card";
import { SproutIcon } from "@/components/milestone-card/SproutIcon";
import { LeafIcon } from "@/components/milestone-card/LeafIcon";
import { TreeIcon } from "@/components/milestone-card/TreeIcon";
import { MatureTreeIcon } from "@/components/milestone-card/MatureTreeIcon";

interface Milestone {
  title: string;
  description: string;
  requirement: string;
  value: number;
  image?: string;
}

function iconForSessionCount(value: number) {
  if (value >= 150) return <MatureTreeIcon />;
  if (value >= 100) return <TreeIcon />;
  if (value >= 50) return <LeafIcon />;
  return <SproutIcon />;
}

export default () => {
  const router = useRouter();
  const { stats, error } = useFocusStats();
  const isLoading = stats === null && error === null;
  const totalSessionCount = stats?.totalSessions ?? 0;

  const renderMilestoneCard = (milestone: Milestone) => {
    const locked = totalSessionCount < milestone.value;
    const rarity = rarityForSessionCount(milestone.value);

    return (
      <div className="shink-0 flex h-96 w-64">
        <MilestoneCard
          title={milestone.title}
          subtitle={locked ? milestone.requirement : milestone.description}
          art=""
          rarity={rarity}
          icon={iconForSessionCount(milestone.value)}
          locked={locked}
          footer={
            !locked && (
              <RWebShare
                data={{
                  text: "A great pomodoro achievement was made!",
                  title: milestone.title,
                  ...(milestone.image ? { url: milestone.image } : {}),
                }}
              >
                <Button className="bg-accent-work hover:bg-accent-work/90 w-full rounded-full font-semibold text-white">
                  Share
                </Button>
              </RWebShare>
            )
          }
        />
      </div>
    );
  };

  const MilestoneSkeletonCard = () => {
    // Static placeholder using the app's own light tokens (not shadcn's
    // theme-variable `bg-muted`, which resolves dark under the default
    // dark ThemeProvider and looked out of place on this light page).
    return (
      <div className="shink-0 border-hairline bg-surface h-96 w-64 rounded-3xl border" />
    );
  };

  return (
    <div className="bg-canvas flex h-screen w-screen flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-ink text-2xl font-bold">Milestones</h2>
        <Button
          variant="outline"
          className="border-hairline text-ink hover:bg-ink/5 hover:text-ink rounded-full bg-transparent font-semibold"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex h-min w-full flex-nowrap justify-start gap-5 overflow-x-auto p-3">
        <AnimatePresence>
          {milestones.map((milestone) => (
            <div className="h-full" key={milestone.value}>
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    className="h-full"
                    key="skeleton"
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <MilestoneSkeletonCard />
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {renderMilestoneCard(milestone)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
