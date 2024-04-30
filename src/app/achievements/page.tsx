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
import Spline from "@splinetool/react-spline";
import axios from "axios";
import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { RWebShare } from "react-web-share";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence, motion } from "framer-motion";

const hiddenMilestoneMedel =
  "https://prod.spline.design/G9KwJ8ipTOZ3kUOc/scene.splinecode";

export default () => {
  const { user } = useUser();
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [isLoading, setLoadingState] = useState(true);

  const serverBaseUrl =
    process.env.MODE == "development"
      ? process.env.NEXT_PUBLIC_DEVELOPMENT_SERVER_BASE_URL
      : process.env.NEXT_PUBLIC_PRODUCTION_SERVER_BASE_URL;

  useEffect(() => {
    if (user) {
      axios.get(serverBaseUrl + `/${user.sub}/total_sessions`).then((res) => {
        setTotalSessionCount(res.data as number);
        setLoadingState(false);
      });
    }
  }, [user]);

  const MilestoneCard = ({ milestone }): JSX.Element => {
    return (
      <div className="shink-0 flex h-96 w-64">
        {totalSessionCount < milestone.value ? (
          <Card className="flex h-full w-64 flex-col justify-between p-6">
            <CardTitle className="text-center">{milestone.title}</CardTitle>
            <CardContent className="h-48">
              <Spline scene={hiddenMilestoneMedel} />
            </CardContent>
            <CardFooter className="h-20">
              <h2 className="text-center text-lg font-medium">
                {milestone.requirement}
              </h2>
            </CardFooter>
          </Card>
        ) : (
          <Card className="flex h-full w-64 flex-col justify-between">
            <CardHeader>
              <CardTitle>{milestone.title}</CardTitle>
              <CardDescription>{milestone.description}</CardDescription>
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
                <Button className="w-full">Share</Button>
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
    <div className="flex h-screen w-screen flex-col gap-3 p-3">
      <h2 className="text-2xl font-bold	">Milestones</h2>
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
