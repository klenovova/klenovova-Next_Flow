// workflow response
interface Positionn {
  x: number;
  y: number;
}

interface Data {
  playlistId: string;
  name: string;
  description: string;
  image: string;
  total: number;
  owner: string;

  // TODO: Better typing
  [key: string]: any;
}

interface Computed {
  width: number;
  height: number;
  positionAbsolute: Position;
}

interface RFState {
  position: Positionn;
  data?: Data;
  computed?: Computed;
  selected?: boolean;
  dragging?: boolean;
}

// TODO: add more param types
interface Params {
  id?: string;
  [key: string]: any;
}

interface Source {
  id: string;
  type: string;
  params?: Params;
  rfstate: RFState;
  // sources?: string[];
}

interface Source {
  id: string;
  type: string;
  params: any;
  tracks?: SpotifyApi.PlaylistTrackObject[];
  rfstate: RFState;
}

interface Operation {
  id: string;
  type:
    | "Filter.filter"
    | "Filter.dedupeTracks"
    | "Filter.dedupeArtists"
    | "Filter.match"
    | "Filter.limit"
    | "Combiner.push"
    | "Combiner.alternate"
    | "Utility.save"
    | "Utility.removeKeys"
    | "Utility.includeOnlyKeys"
    | "Utility.summary"
    | "Order.sort"
    | "Order.shuffle"
    | "Library.saveAsNew"
    | "Library.saveAsAppend"
    | "Library.saveAsReplace";
  params: Record<string, any>;
  sources: string[];
  tracks?: SpotifyApi.PlaylistTrackObject[];
  rfstate: RFState;
}

interface WorkflowObject {
  id?: string;
  name: string;
  description?: string;
  // : Source[];
  operations: Operation[];
  connections: Connection[];
  dryrun?: boolean;
}

interface WorkflowResponse {
  id?: string;
  name: string;
  workflow: WorkflowObject;
  cron?: string;
  createdAt?: number;
  lastRunAt?: number;
  modifiedAt?: number;
}

type WorkflowRunOperation = {
  id: string;
  workflowRunId: string;
  completedAt: string;
  data: string;
  startedAt: string;
};

interface QueueResponse {
  id: string;
  workflowId: string;
  status: string;
  error?: string;
  startedAt: string;
  completedAt: string;
  workerId: string;
  returnValues?: any;
  workflow?: WorkflowObject;
  operations?: WorkflowRunOperation[];
}

interface SystemInfo {
  workers: {
    status: string | null;
    joinedAt: Date | null;
    concurrency: number | null;
    threads: number | null;
  }[];
  systemStatus:
    | string
    | {
        message: string | null;
        status: string | null;
        id: string;
        createdAt: Date | null;
      };
}

type Playlist = {
  playlistId?: string;
  name?: string;
  description?: string;
  image?: string;
  owner?: string;
  total?: number;
};
