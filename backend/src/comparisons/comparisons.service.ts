import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { categorySpecs, rankOffers } from "@fairbuy/core";
import { CONNECTOR, type Connector } from "../connectors/connector.js";
import type { CreateComparison } from "./comparison.schema.js";
import { ComparisonStore, type StoredComparison } from "./comparison.store.js";

@Injectable()
export class ComparisonsService {
  constructor(
    @Inject(CONNECTOR) private readonly connector: Connector,
    @Inject(ComparisonStore) private readonly store: ComparisonStore,
  ) {}

  async create(request: CreateComparison): Promise<StoredComparison> {
    const spec = categorySpecs[request.category];
    if (!spec) {
      throw new BadRequestException(`Unsupported category "${request.category}". Supported: ${Object.keys(categorySpecs).join(", ")}.`);
    }

    const offers = await this.connector.search({ category: request.category, constraints: request.constraints });
    const result = rankOffers({ offers, constraints: request.constraints, spec, weights: request.weights });

    const comparison: StoredComparison = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      connector: this.connector.id,
      request,
      offers,
      result,
    };
    this.store.save(comparison);
    return comparison;
  }

  get(id: string): StoredComparison | undefined {
    return this.store.get(id);
  }
}
