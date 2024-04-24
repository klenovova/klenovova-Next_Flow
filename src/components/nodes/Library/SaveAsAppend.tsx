/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Position } from "@xyflow/react";
import React from "react";
import NodeHandle from "../Primitives/NodeHandle";

import { ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
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

import { ScrollArea } from "@/components/ui/scroll-area";

import Image from "next/image";
import useStore from "~/app/states/store";

import * as z from "zod";
import { CardWithHeader } from "../Primitives/Card";

import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import useBasicNodeState from "~/hooks/useBasicNodeState";
import Debug from "../Primitives/Debug";
import { PlaylistItem as PlaylistItemPrimitive } from "../Primitives/PlaylistItem";

type PlaylistProps = {
  id: string;
  data: any;
};

type Playlist = {
  playlistId?: string;
  name?: string;
  description?: string;
  image?: string;
  total?: number;
  owner?: string;
};

const formSchema = z.object({
  playlistId: z.string().min(1, {
    message: "Playlist is required.",
  }),
});

const PlaylistItem = ({
  playlist,
  onSelect,
}: {
  playlist: Playlist;
  onSelect: () => void;
}) => (
  <CommandItem
    key={playlist.playlistId}
    value={playlist.playlistId}
    onSelect={onSelect}
  >
    <PlaylistItemPrimitive playlist={playlist} />
  </CommandItem>
);

function SaveAsReplaceComponent({ id, data }: PlaylistProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = React.useState<Playlist>({});
  const [search, setSearch] = React.useState("");

  const { session, userPlaylists, nodes } = useStore((state) => ({
    session: state.session,
    userPlaylists: state.userPlaylists,
    nodes: state.nodes,
  }));

  const {
    state,
    isValid,
    targetConnections,
    sourceConnections,
    form,
    formState,
    register,
    getNodeData,
    updateNodeData,
  } = useBasicNodeState(id, formSchema);

  React.useEffect(() => {
    const userPlaylists = async () => {
      try {
        const response = await fetch(
          `/api/user/${session.user.providerAccountId}/playlists`,
        );
        const data = await response.json();
        useStore.setState({ userPlaylists: data });
      } catch (err) {
        console.error(err);
      }
    };

    // debounce({delay: 500}, setUserPlaylists)();
    userPlaylists()
      .then(() => {
        console.info("user playlists updated");
      })
      .catch((err) => {
        console.error(err);
      });
  }, [session]);

  const handleSelect = (playlist) => {
    console.info("handle select", playlist);
    form!.setValue("playlistId", playlist.playlistId, {
      shouldValidate: true,
    });
    console.info("data after update", getNodeData(id));
    setSelectedPlaylist(playlist as Playlist);
    setOpen(false);
  };

  return (
    <CardWithHeader
      title={`Save as Replace`}
      id={id}
      type="Library"
      status={formState!.isValid ? "success" : "error"}
      info="Replace all tracks in a playlist with new tracks."
    >
      <NodeHandle
        type="source"
        position={Position.Right}
        style={{ background: "#555" }}
      />
      <NodeHandle
        type="target"
        position={Position.Left}
        style={{ background: "#555" }}
      />
      <Form {...form!}>
        <form onSubmit={form!.handleSubmit((data) => console.info(data))}>
          <div className="flex flex-col gap-4">
            <FormField
              control={form!.control}
              name="playlistId"
              render={({ field, formState }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Playlist</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="h-[min-content] w-full justify-between"
                      >
                        {selectedPlaylist.image ? (
                          <div className="flex max-w-full items-center gap-4">
                            <Image
                              className="h-10 w-10 rounded-sm"
                              src={selectedPlaylist.image}
                              alt=""
                              width={40}
                              height={40}
                              unoptimized
                            />
                            <div className="flex w-[160px] flex-col items-start">
                              <div className="max-w-full overflow-hidden overflow-ellipsis whitespace-nowrap font-medium text-sm">
                                {selectedPlaylist.name}
                              </div>
                              <div className="text-xs opacity-80">
                                {selectedPlaylist.owner} -{" "}
                                {selectedPlaylist.total} tracks
                              </div>
                            </div>
                          </div>
                        ) : (
                          "Select playlist..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search playlist..."
                          value={search}
                          onValueChange={(e) => setSearch(e)}
                        />
                        <CommandEmpty>No playlist found.</CommandEmpty>
                        <CommandGroup>
                          <ScrollArea className="h-[200px] w-full rounded-md">
                            {userPlaylists.length > 0
                              ? userPlaylists.map((playlist) => (
                                  <PlaylistItem
                                    key={playlist.playlistId}
                                    playlist={playlist}
                                    onSelect={() => handleSelect(playlist)}
                                  />
                                ))
                              : Array.from({ length: 3 }).map((_, index) => (
                                  <CommandItem
                                    key={`loading-${index}`}
                                    value="loading"
                                    onSelect={() => {
                                      setSelectedPlaylist({
                                        playlistId: "loading",
                                        name: "loading",
                                        description: "loading",
                                        image: "",
                                        owner: "loading",
                                        total: 0,
                                      });
                                      setOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 animate-pulse rounded-md bg-gray-700"></div>
                                      <div className="flex animate-pulse flex-col">
                                        <div className="animate-pulse font-medium text-sm">
                                          loading...
                                        </div>
                                        <div className="animate-pulse text-xs opacity-80">
                                          loading...
                                        </div>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                          </ScrollArea>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
      <Debug
        id={id}
        isValid={formState!.isValid}
        TargetConnections={targetConnections}
        SourceConnections={sourceConnections}
      />
    </CardWithHeader>
  );
}

export default SaveAsReplaceComponent;
