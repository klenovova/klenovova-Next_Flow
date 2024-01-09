/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { memo, useMemo } from "react";
import {
  Handle,
  Position,
  useHandleConnections,
  useNodesData,
  useReactFlow,
} from "@xyflow/react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { AlertCircle } from "lucide-react";
import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { ScrollArea } from "@/components/ui/scroll-area";

import Image from "next/image";
import useStore from "~/app/states/store";

import { useShallow } from "zustand/react/shallow";

import { Separator } from "~/components/ui/separator";

import { CardWithHeader } from "../Primitives/Card";

type PlaylistProps = {
  id: string;
  data: any;
};

type Playlist = {
  playlistId?: string;
  name?: string;
  description?: string;
  image?: string;
  owner?: string;
  total?: number;
};

type State = {
  playlists: Playlist[];
  playlistIds: string[];
  invalidNodesCount: number;
  summary: {
    total: number;
  };
};

export function AlertComponent({
  variant,
  title,
  description,
}: {
  variant: "default" | "destructive";
  title: string;
  description: string;
}) {
  return (
    <Alert variant={variant}>
      {variant === "default" ? (
        <Info className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="font-normal">{description}</AlertDescription>
    </Alert>
  );
}

const AlternateComponent: React.FC<PlaylistProps> = React.memo(
  ({ id, data }) => {
    const nodes = useStore(useShallow((state) => state.nodes));
    const [state, setState] = React.useState<State>({
      playlists: [],
      playlistIds: [],
      invalidNodesCount: 0,
      summary: {
        total: 0,
      },
    });

    const TargetConnections = useHandleConnections({ type: "target" });
    const SourceConnections = useHandleConnections({ type: "source" });

    const getNodeData = useMemo(
      () => (id: string) => nodes.find((node) => node.id === id)?.data,
      [nodes],
    );

    const [isValid, setIsValid] = React.useState(false);

    const { updateNodeData } = useReactFlow();
    React.useEffect(() => {
      let valid = false;
      let playlists: Playlist[] = [];
      let invalidNodesCount = 0;

      if (TargetConnections?.length > 0) {
        const targetConnections = TargetConnections.map((connection) =>
          getNodeData(connection.source),
        );
        valid = targetConnections.every((target) => target?.playlistId);
        playlists = valid ? (targetConnections as Playlist[]) : [];
        invalidNodesCount = targetConnections.filter(
          (target) => !target?.playlistId,
        ).length;
      }
      const total = playlists.reduce(
        (acc, curr) => acc + (curr.total ?? 0),
        0,
      );

      // only get playlist ids only
      const playlistIds = playlists.map((playlist) => playlist.playlistId) as string[];

      setIsValid(valid);
      setState({
        playlistIds,
        playlists,
        invalidNodesCount,
        summary: {
          total,
        },
      });
    }, [TargetConnections, getNodeData]);

    React.useEffect(() => {
      const currentNodeData = getNodeData(id);
      if (JSON.stringify(currentNodeData?.playlistIds) !== JSON.stringify(state.playlistIds)) {
        updateNodeData(id, {
          playlistIds: state.playlistIds,
          playlists: state.playlists,
        });
      }
    }, [state.playlistIds, getNodeData, id, updateNodeData]);


    return (
      <CardWithHeader
        title="Alternate"
        type="Combiner"
        status={isValid === null ? "loading" : isValid ? "success" : "error"}
        info="Interleaves the tracks from multiple playlists"
      >
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: "#555" }}
        />
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: "#555" }}
        />
        <div className="flex flex-col gap-4">
          <div className="flex flex-col text-sm font-medium">
            {TargetConnections?.length === 0 ? (
              <AlertComponent
                variant="destructive"
                title="Error"
                description="No playlist component set as input"
              />
            ) : isValid ? (
              <div className="flex flex-col">
                <span>Combining {TargetConnections?.length} playlists</span>
                <span className="text-xs font-normal opacity-80">
                  Total of {state.summary.total} tracks
                </span>
              </div>
            ) : (
              <AlertComponent
                variant="destructive"
                title="Error"
                description={`${state.invalidNodesCount} nodes do not have a playlist component connected`}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            {state.playlists?.map((playlist) => (
              <div className="flex items-center gap-2">
                <Image
                  className="h-8 w-8 rounded-sm"
                  src={playlist.image ?? "/images/spotify.png"}
                  alt=""
                  width={32}
                  height={32}
                />
                <div className="flex flex-col">
                  <div className="text-sm font-medium">{playlist.name}</div>
                  <div className="text-xs text-gray-400">
                    {playlist.owner} - {playlist.total} tracks
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="whitespace-pre-wrap rounded-md bg-red-500 p-2 py-2">
            <pre className="whitespace-pre-wrap text-sm font-bold">
              Debug info
            </pre>
            <pre>
              <pre className="text-xs">id: {id}</pre>
              <pre className="text-xs">isValid: {isValid?.toString()}</pre>
              <pre className="text-xs whitespace-pre-wrap break-all">data: {JSON.stringify(getNodeData(id), null, 2)}</pre>
            </pre>
            <ScrollArea className="nodrag flex max-h-[200px] flex-col gap-2 overflow-auto overflow-x-hidden py-2">
              <pre className="text-xs">TargetConnections:</pre>
              {TargetConnections?.map((connection) => (
                <pre key={connection.source} className="py-1 text-xs">
                  <pre>source: {connection.source}</pre>
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(getNodeData(connection.source), null, 2)}
                  </pre>
                </pre>
              ))}

              <pre className="text-xs">SourceConnections:</pre>
              {SourceConnections?.map((connection) => (
                <pre key={connection.source} className="py-1 text-xs">
                  <pre>source: {connection.source}</pre>
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(getNodeData(connection.target), null, 2)}
                  </pre>
                </pre>
              ))}
            </ScrollArea>
          </div>
        </div>
        <CardFooter></CardFooter>
      </CardWithHeader>
    );
  },
);

export default React.memo(AlternateComponent);
