import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { db } from "@/server/db";
import { Logger } from "@/lib/log";
import { type API } from "~/types/workflows";

const log = new Logger("/api/workflow/[id]");

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: { uid: string };
  },
) {
  const session = (await getServerSession({ req: request, ...authOptions }))!;

  const workflows = await db.query.workflowJobs.findMany({
    where: (workflowJobs, { eq }) => eq(workflowJobs.userId, session.user.id),
    with: {
      workflowRuns: true,
    },
  });

  if (!workflows.length) {
    return NextResponse.json("No workflows found", { status: 404 });
  }

  const res = workflows.map(
    ({ id, cron, workflow, createdAt, workflowRuns }) => ({
      id,
      cron,
      workflow: workflow && JSON.parse(workflow),
      createdAt: createdAt?.getTime(),
      lastRunAt: workflowRuns[0]?.startedAt?.getTime(),
    }),
  ) as API.WorkflowsResponse;

  log.info(`Returning workflows for user ${session.user.id}`);
  return NextResponse.json(res);
}
