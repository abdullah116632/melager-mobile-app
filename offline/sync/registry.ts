import type { CollectionPuller, OutboxProcessor } from "./types";

export class SyncRegistry {
  private readonly processors = new Map<string, OutboxProcessor>();
  private readonly pullers = new Map<string, CollectionPuller>();

  registerProcessor(entityType: string, processor: OutboxProcessor): void {
    this.processors.set(entityType, processor);
  }

  registerPuller(collection: string, puller: CollectionPuller): void {
    this.pullers.set(collection, puller);
  }

  getProcessor(entityType: string): OutboxProcessor | undefined {
    return this.processors.get(entityType);
  }

  getPullers(): ReadonlyArray<
    readonly [collection: string, puller: CollectionPuller]
  > {
    return [...this.pullers.entries()];
  }
}
