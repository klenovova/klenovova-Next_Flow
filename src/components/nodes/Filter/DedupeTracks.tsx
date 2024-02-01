/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Handle, Position } from "@xyflow/react";
import React from "react";
import useBasicNodeState from "~/hooks/useBasicNodeState";
import { CardWithHeader } from "../Primitives/Card";
import Debug from "../Primitives/Debug";
import { SourceList } from "../Primitives/SourceList";

type PlaylistProps = {
  id: string;
  data: any;
};

const DedupeTracksComponent: React.FC<PlaylistProps> = React.memo(
  ({ id, data }) => {
    const { state, isValid, targetConnections, sourceConnections } =
      useBasicNodeState(id);

    return (
      <CardWithHeader
        title="Dedupe Tracks"
        id={id}
        type="Filter"
        status={isValid === null ? "loading" : isValid ? "success" : "error"}
        info="Remove duplicate tracks from multiple playlists"
      >
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: "#fff",
            padding: "0.2rem",
            borderRadius: "0.5px",
            border: "1px solid #555",
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: "#fff",
            padding: "0.2rem",
            borderRadius: "0.5px",
            border: "1px solid #555",
          }}
        />
        <div className="flex flex-col gap-4">
          <SourceList
            state={state}
            isValid={isValid}
            operationType="Filtering"
          />
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

export default DedupeTracksComponent;
