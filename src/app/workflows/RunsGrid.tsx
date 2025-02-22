"use client";

import { formatDistanceToNow } from "date-fns";
import { Clock } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { mutate } from "swr";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Timeline,
  TimelineContent,
  TimelineDot,
  TimelineHeading,
  TimelineItem,
  TimelineLine,
} from "~/components/ui/timeline";

import { fetcher } from "./WorkflowGrid";

function relativeDate(date: number) {
  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    return "Invalid date";
  }
  const relativeDate = formatDistanceToNow(dateObj, { addSuffix: true });
  const formattedDate = dateObj.toLocaleString();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span>{relativeDate}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formattedDate}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const progressFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch");
  }
  return res.json();
};

function RunProgress({ runId }: { runId: string }) {
  const { data, error } = useSWR(
    `/api/workflow/queue/${runId}`,
    progressFetcher,
    {
      refreshInterval: 5000,
    },
  );

  if (error) {
    return <Badge color="error">Error</Badge>;
  }

  if (!data) {
    return <Badge color="warning">Pending</Badge>;
  }

  const totalOperations = data.workflow.operations.length;
  const completedOperations = data.operations.length;

  if (completedOperations === totalOperations) {
    mutate(`/api/user/@me/workflows`);
  }

  return (
    <Badge color="success">
      {completedOperations}/{totalOperations}
    </Badge>
  );
}

const EmptyRunCard = () => (
  <Card className="w-full">
    <CardHeader className="pb-2">
      <CardTitle></CardTitle>
    </CardHeader>
    <CardContent className="flex flex-row gap-1 pb-2">
      <span className="text-muted-foreground">
        You&apos;ll find your runs here!
      </span>
    </CardContent>
    <CardFooter className="flex flex-row gap-1"></CardFooter>
  </Card>
);

export function RunsGrid() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data,
    error,
    isLoading: isSWRLoading,
    mutate,
  } = useSWR<Workflow.WorkflowResponse[] | undefined>(
    `/api/user/@me/workflows`,
    fetcher,
  );

  const isLoading = isSWRLoading || isRefreshing;

  const runs = data
    ?.flatMap((workflow) => {
      return workflow.runs?.map((run) => {
        return {
          id: run.id,
          startedAt: run.startedAt,
          workflow: workflow,
          error: run.error,
          completedAt: run.completedAt,
        };
      });
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b!.startedAt).getTime() - new Date(a!.startedAt).getTime(),
    )
    .slice(0, 10);

  return (
    <div className="min-w-60 pt-2">
      <div id="workflow-runs" className="flex shrink flex-col items-start">
        <div className="flex flex-row items-start pb-1">
          <h1 className="text-xl font-medium leading-9 tracking-tight">
            Latest Runs
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 py-3">
          <Timeline>
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <TimelineItem key={i} status="default">
                  <TimelineHeading>{`Loading`}</TimelineHeading>
                  <TimelineDot status="default" />
                  <TimelineLine done={false} />
                  <TimelineContent>
                    <Skeleton className="w-30 h-4" />
                  </TimelineContent>
                </TimelineItem>
              ))
            ) : runs && runs.length > 0 ? (
              runs.map((run) =>
                run ? (
                  <TimelineItem
                    key={run.id}
                    className={run.error ? "error" : ""}
                    status={run.completedAt ? "done" : "default"}
                  >
                    <TimelineHeading className="flex flex-col">
                      <div>
                        {new Date(run.startedAt).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(run.startedAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {relativeDate(run.startedAt)}
                      </div>
                    </TimelineHeading>
                    <TimelineDot
                      status={
                        run.error
                          ? "error"
                          : run.completedAt
                            ? "done"
                            : "current"
                      }
                      className={
                        !run.completedAt ? "animate-pulse text-blue-600" : ""
                      }
                    />
                    <TimelineLine done={!!run.completedAt} />
                    <TimelineContent className="w-full">
                      <Card className="my-2 flex w-full flex-col gap-1 px-4 py-2">
                        <CardTitle className="text-base">
                          {run.workflow.workflow.name}
                        </CardTitle>
                        {run.error ? (
                          <div className="text-xs text-red-500">
                            Error: {run.error}
                          </div>
                        ) : run.startedAt && run.completedAt ? (
                          <div className="flex flex-row items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {(new Date(run.completedAt).getTime() -
                              new Date(run.startedAt).getTime()) /
                              1000}{" "}
                            seconds
                          </div>
                        ) : (
                          <div className="flex flex-row items-center gap-2 text-xs text-muted-foreground">
                            <RunProgress runId={run.id} />
                            {`Currently running`}
                          </div>
                        )}
                      </Card>
                    </TimelineContent>
                  </TimelineItem>
                ) : null,
              )
            ) : (
              <EmptyRunCard />
            )}
          </Timeline>
        </div>
      </div>
    </div>
  );
}
