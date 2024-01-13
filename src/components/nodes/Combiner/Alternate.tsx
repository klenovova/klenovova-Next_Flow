/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Handle, Position } from "@xyflow/react";

import { CardFooter } from "@/components/ui/card";

import { Separator } from "~/components/ui/separator";

import { CardWithHeader } from "../Primitives/Card";

import useBasicNodeState from "~/hooks/useBasicNodeState";
import Debug from "../Primitives/Debug";
import { SourceList } from "../Primitives/SourceList";

type PlaylistProps = {
  id: string;
  data: any;
};

const AlternateComponent: React.FC<PlaylistProps> = React.memo(
  ({ id, data }) => {
    const { state, isValid, targetConnections, sourceConnections } =
      useBasicNodeState(id);

    return (
      <CardWithHeader
        title={`Alternate`}
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
          <SourceList state={state} isValid={isValid} operationType="Combining" />
          <Debug
            id={id}
            isValid={isValid}
            TargetConnections={targetConnections}
            SourceConnections={sourceConnections}
          />
        </div>
      </CardWithHeader>
    );
  },
);

export default AlternateComponent;
