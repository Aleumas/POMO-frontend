"use client";
import { Button } from "@/components/ui/button";
import milestones from "../../../public/achievements/milestones/file.json";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { RWebShare } from "react-web-share";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useFocusStats } from "@/hooks/useFocusStats";

const Spline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
});

const hiddenMilestoneMedel =
  "https://prod.spline.design/G9KwJ8ipTOZ3kUOc/scene.splinecode";

export default () => {
  const router = useRouter();
  const { stats, error } = useFocusStats();
  const isLoading = stats === null && error === null;
  const totalSessionCount = stats?.totalSessions ?? 0;

  const MilestoneCard = ({ milestone }): JSX.Element => {
    return (
      <div className="shink-0 flex h-96 w-64">
        {totalSessionCount < milestone.value ? (
          <Card className="bg-surface border-hairline flex h-full w-64 flex-col justify-between p-6">
            <CardTitle className="text-ink text-center">
              {milestone.title}
            </CardTitle>
            <CardContent className="h-48">
              <Spline scene={hiddenMilestoneMedel} />
            </CardContent>
            <CardFooter className="h-20">
              <h2 className="text-ink-muted text-center text-lg font-medium">
                {milestone.requirement}
              </h2>
            </CardFooter>
          </Card>
        ) : (
          <Card className="bg-surface border-hairline flex h-full w-64 flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-ink">{milestone.title}</CardTitle>
              <CardDescription className="text-ink-muted">
                {milestone.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-52">
              <Spline scene={milestone.medal} />
            </CardContent>
            <CardFooter>
              <RWebShare
                data={{
                  text: "A great pomodoro achievement was made!",
                  url: milestone.image,
                  title: milestone.title,
                }}
              >
                <Button className="bg-accent-work hover:bg-accent-work/90 w-full rounded-full font-semibold text-white">
                  Share
                </Button>
              </RWebShare>
            </CardFooter>
          </Card>
        )}
      </div>
    );
  };

  const MilestoneSkeletonCard = () => {
    return (
      <div className="shink-0 h-96 w-64">
        <Skeleton className="flex h-full w-64 flex-col justify-between p-3" />
      </div>
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
                    <MilestoneCard milestone={milestone} />
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
