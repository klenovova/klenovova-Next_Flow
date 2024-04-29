/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */

import { Base } from "./Base";
import Combiner from "./Combiner";
import Filter from "./Filter";
import Library from "./Library";
import Order from "./Order";
import Playlist from "./Playlist";
import Selector from "./Selector";
import Utility from "./Utility";

import { Logger } from "../log";

const log = new Logger("workflow");
export const operationParamsTypesMap = {
  "Filter.filter": {
    filterKey: { type: "string", required: true },
    filterValue: { type: "string", required: true },
  },
  "Filter.dedupeTracks": {},
  "Filter.dedupeArtists": {},
  "Filter.match": {
    matchKey: { type: "string", required: true },
    matchValue: { type: "string", required: true },
  },
  "Filter.limit": {
    limit: { type: "number", required: true },
  },
  "Combiner.push": {},
  "Combiner.alternate": {},
  "Utility.save": {},
  "Utility.removeKeys": {
    keys: { type: "string[]", required: true },
  },
  "Utility.includeOnlyKeys": {
    keys: { type: "string[]", required: true },
  },
  "Utility.summary": {},
  "Order.sort": {
    sortKey: { type: "string", required: true },
    sortOrder: { type: "string", required: true },
  },
  "Order.shuffle": {},
  "Library.saveAsNew": {
    name: { type: "string", required: true },
    isPublic: { type: "boolean" },
    collaborative: { type: "boolean" },
    description: { type: "string" },
  },
  "Library.playlistTracks": {
    playlistId: { type: "string", required: true },
    limit: { type: "number" },
    offset: { type: "number" },
  },
  "Library.saveAsAppend": {
    playlistId: { type: "string", required: true },
  },
  "Library.saveAsReplace": {
    playlistId: { type: "string", required: true },
  },
  "Playlist.getTracksRecomendation": {
    limit: { type: "number", required: true },
    market: { type: "string" },
    seedTracks: { type: "string[]" },
    seedArtists: { type: "string[]" },
    seedGenres: { type: "string[]" },
    minAcousticness: { type: "number" },
    maxAcousticness: { type: "number" },
    targetAcousticness: { type: "number" },
    minDanceability: { type: "number" },
    maxDanceability: { type: "number" },
    targetDanceability: { type: "number" },
  },
  "Library.likedTracks": {
    limit: { type: "number" },
    offset: { type: "number" },
  },
  "Selector.first": {
    count: { type: "number" },
  },
  "Selector.last": {
    count: { type: "number" },
  },
  "Selector.allButFirst": {},
  "Selector.allButLast": {},
  "Selector.recommend": {
    seedType: { type: "string" },
    count: { type: "number" },
  },
} as Record<string, Record<string, { type: string; required?: boolean }>>;

import type { Workflow } from "./types/base";

export const operations: Workflow.Operations = {
  Filter,
  Combiner,
  Utility,
  Order,
  Playlist,
  Library,
  Selector,
};
export class Runner extends Base {
  async fetchSources(
    operation: Operation,
    sourceValues: Map<string, any>,
    workflow: WorkflowObject,
  ) {
    const sources = [] as SpotifyApi.PlaylistTrackObject[];
    for (const source of operation.sources) {
      if (sourceValues.has(source)) {
        sources.push(
          sourceValues.get(source) as SpotifyApi.PlaylistTrackObject,
        );
      } else if (sourceValues.has(`${source}.tracks`)) {
        sources.push(
          sourceValues.get(
            `${source}.tracks`,
          ) as SpotifyApi.PlaylistTrackObject,
        );
      } else {
        const sourceOperation = workflow.operations.find(
          (op) => op.id === source,
        );
        if (sourceOperation) {
          const result = await this.runOperation(
            source,
            sourceValues,
            workflow,
          );
          sources.push(result as SpotifyApi.PlaylistTrackObject);
        } else {
          log.error(
            `Source ${source} not found in sourceValues or operations.`,
          );
        }
      }
    }
    return sources;
  }

  /**
   * Runs the specified operation in the workflow.
   * @param operationId - The ID of the operation to run.
   * @param sourceValues - A map of source values.
   * @param workflow - The workflow object.
   * @returns A Promise that resolves to the result of the operation.
   */
  async runOperation(
    operationId: string,
    sourceValues: Map<string, any>,
    workflow: WorkflowObject,
  ) {
    const operation = workflow.operations.find((op) => op.id === operationId);
    if (!operation) {
      log.error(`Operation ${operationId} not found.`);
      return;
    }

    const sources = await this.fetchSources(operation, sourceValues, workflow);

    // Split the operation type into class name and method name
    const [className, methodName] = operation.type.split(".") as [
      keyof Workflow.Operations,
      keyof Workflow.Operations[keyof Workflow.Operations],
    ];

    // Get the class from the operations object
    const operationClass = operations[className];

    // add dryrun to save operations
    if (workflow.dryrun) {
      log.info("DRYRUN!");
      operation.params.dryrun = true;
    }

    const result = await operationClass[methodName](
      this.spClient,
      sources,
      operation.params,
    );

    sourceValues.set(operationId, result);
    return result;
  }

  /**
   * Sorts the operations in the workflow based on their dependencies.
   *
   * @param workflow - The workflow to sort the operations for.
   * @returns An array of sorted operations.
   */
  sortOperations(workflow: WorkflowObject) {
    log.info("Sorting operations...");
    const sortedOperations = [] as Operation[];
    const operations = [...workflow.operations] as Operation[];

    let hasLoop = false;
    const visited = new Set();
    const recStack = new Set();

    function detectLoop(operationId: string, operationsMap: Map<string, any>) {
      visited.add(operationId);
      recStack.add(operationId);

      const operation = operationsMap.get(operationId) as Operation;
      if (operation?.sources) {
        for (const source of operation.sources) {
          if (!visited.has(source) && detectLoop(source, operationsMap)) {
            return true;
          } else if (recStack.has(source)) {
            return true;
          }
        }
      }

      recStack.delete(operationId);
      return false;
    }

    // Create a map for quick lookup
    const operationsMap = new Map() as Map<string, Operation>;
    for (const operation of operations) {
      operationsMap.set(operation.id, operation);
    }

    // Check each operation for loops
    for (const operation of operations) {
      if (detectLoop(operation.id, operationsMap)) {
        hasLoop = true;
        break;
      }
    }

    if (hasLoop) {
      throw new Error(
        "Loop detected in workflow at operation: " +
          JSON.stringify(operationsMap.get(Array.from(recStack)[0] as string)),
      );
    }

    let iterationCount = 0;
    const maxIterations = operations.length * 2;

    while (operations.length > 0) {
      if (iterationCount++ > maxIterations) {
        throw new Error(
          "Exceeded maximum iterations. There might be a circular dependency in the operations.",
        );
      }
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i]!;
        if (
          operation.sources.every((source) =>
            sortedOperations.find((op) => op.id === source),
          )
        ) {
          sortedOperations.push(operation);
          operations.splice(i, 1);
          break;
        }
      }
    }

    return sortedOperations;
  }
  /**
   * Validates a workflow.
   *
   * @param workflow - The workflow to validate.
   * @returns A tuple containing a boolean indicating whether the validation passed or not, and an array of error messages if validation failed.
   */
  validateWorkflow(
    workflow: WorkflowObject,
  ): Promise<[boolean, string[] | null]> {
    log.info("Validating workflow...");

    // let timeoutOccurred = false;
    const timeout = new Promise<[boolean, string[]]>((_resolve, reject) =>
      setTimeout(() => {
        // timeoutOccurred = true;
        reject(new Error(`Validation timed out after ${5000 / 1000} seconds`));
      }, 5000),
    );

    const validationPromise = new Promise<[boolean, string[] | null]>(
      (resolve) => {
        workflow.operations = this.sortOperations(workflow);
        const operationIds = new Set();
        const errors = [] as string[];

        if (!(workflow.operations && Array.isArray(workflow.operations))) {
          errors.push("Workflow must have 'operations' properties.");
        }

        // Validate operations
        if (workflow.operations.length === 0) {
          errors.push("Workflow must have at least one operation.");
        }

        for (const operation of workflow.operations) {
          if (typeof operation.id !== "string") {
            errors.push(
              `Invalid operation id: ${
                operation.id
              } in operation: ${JSON.stringify(operation)}`,
            );
          }

          if (typeof operation.type !== "string") {
            errors.push(
              `Invalid operation type: ${
                operation.type
              } in operation: ${JSON.stringify(
                operation,
              )} its type is ${typeof operation.type}`,
            );
          }

          if (operationIds.has(operation.id)) {
            errors.push(
              `Duplicate operation id: ${
                operation.id
              } in operation: ${JSON.stringify(operation)}`,
            );
          }
          operationIds.add(operation.id);

          const operationType = operation.type;
          if (!operationParamsTypesMap.hasOwnProperty(operationType)) {
            errors.push(
              `Invalid operation type: ${operationType} in operation: ${JSON.stringify(
                operation,
              )}`,
            );
          } else {
            const [className, methodName] = operationType.split(".") as [
              keyof Workflow.Operations,
              keyof Workflow.Operations[keyof Workflow.Operations],
            ];
            const operationClass = operations[className];
            if (
              !operationClass ||
              typeof operationClass[methodName] !== "function"
            ) {
              errors.push(
                `Invalid operation type: ${operationType} in operation: ${JSON.stringify(
                  operation,
                )}`,
              );
            }
          }

          const operationParams = operationParamsTypesMap[
            operation.type
          ] as Record<string, { type: string; required?: boolean }>;
          if (operationParams) {
            const paramsCopy = { ...operation.params };
            for (const [param, paramType] of Object.entries(operationParams)) {
              if (operation.params[param]) {
                if (paramType.type === "string[]") {
                  if (
                    !(
                      Array.isArray(operation.params[param]) &&
                      operation.params[param].every(
                        (item: any) => typeof item === "string",
                      )
                    )
                  ) {
                    errors.push(
                      `Invalid param type: ${param} in operation: ${JSON.stringify(
                        operation,
                      )} expected string[] but got ${typeof operation.params[
                        param
                      ]}`,
                    );
                  }
                } else if (paramType.type === "number[]") {
                  if (
                    !(
                      Array.isArray(operation.params[param]) &&
                      operation.params[param].every(
                        (item: any) => typeof item === "number",
                      )
                    )
                  ) {
                    errors.push(
                      `Invalid param type: ${param} in operation: ${JSON.stringify(
                        operation,
                      )} expected number[] but got ${typeof operation.params[
                        param
                      ]}`,
                    );
                  }
                  // biome-ignore lint/suspicious/useValidTypeof: <explanation>
                } else if (typeof operation.params[param] !== paramType.type) {
                  errors.push(
                    `Invalid param type: ${param} in operation: ${JSON.stringify(
                      operation,
                    )} expected ${paramType.type} but got ${typeof operation
                      .params[param]}`,
                  );
                }
              } else if (paramType.required) {
                errors.push(
                  `Missing required param: ${param} in operation: ${JSON.stringify(
                    operation,
                  )}`,
                );
              }
              delete paramsCopy[param];
            }
          }

          if (
            !(
              operation.id &&
              operation.type &&
              operation.params &&
              operation.sources
            )
          ) {
            const missing = [] as string[];
            if (!operation.id) missing.push("id");
            if (!operation.type) missing.push("type");
            if (!operation.params) missing.push("params");
            if (!operation.sources) missing.push("sources");
            errors.push(
              `Invalid operation structure: ${JSON.stringify(
                operation,
              )} missing ${missing.join(", ")}`,
            );
          }
        }

        const sources = workflow.operations.filter((operation) => {
          return !operation.sources || operation.sources.length === 0;
        });

        for (const source of sources) {
          if (!(source.params.playlistId || source.params.id)) {
            errors.push(
              `First operation must have be a Liked Tracks or Playlist operation: ${JSON.stringify(
                source,
              )}`,
            );
          }
        }

        if (errors.length > 0) {
          log.error(`Validation failed with ${errors.length} errors:`);
          for (const error of errors) {
            log.error(error);
          }
          resolve([false, errors]);
        } else {
          resolve([true, []]);
        }
      },
    );

    return Promise.race([validationPromise, timeout]);
  }
  /**
   * Runs the given workflow.
   *
   * @param workflow - The workflow to be executed.
   * @returns The result of the workflow execution.
   * @throws Error if the workflow is invalid.
   */
  async runWorkflow(workflow: WorkflowObject, timeoutAfter = 20000) {
    let timeoutOccurred = false;

    const timeout = new Promise((_, reject) =>
      setTimeout(() => {
        timeoutOccurred = true;
        reject(
          Error(`Operation timed out after ${timeoutAfter / 1000} seconds`),
        );
      }, timeoutAfter),
    );

    // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
    const workflowPromise = new Promise(async (resolve, reject) => {
      try {
        const sortedOperations = this.sortOperations(workflow);

        workflow.operations = sortedOperations;
        const [valid, errors] = await this.validateWorkflow(workflow);

        if (!valid && errors) {
          throw new Error(`Invalid workflow: ${errors.join("\n")}`);
        }

        const sourceValues = new Map();

        const final: any[] = [];
        for (const operation of sortedOperations) {
          if (timeoutOccurred) {
            reject(new Error("Operation timed out after 10 seconds"));
          }
          const res = await this.runOperation(
            operation.id,
            sourceValues,
            workflow,
          );
          final.push(res);
        }

        resolve(final.filter((f) => f.id));
      } catch (error) {
        reject(error);
      }
    });

    return Promise.race([workflowPromise, timeout]);
  }
}
