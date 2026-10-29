import type { CategorySpec } from "@fairbuy/core";

// Turns a free-text request into a proposal. The output is untrusted (a language model
// will produce it): the service validates it with the core schema before anyone sees it.
// Provider credentials, when there are any, stay in the implementation's server-side config.
export interface Interpreter {
  readonly id: string;
  interpret(text: string, specs: Readonly<Record<string, CategorySpec>>): Promise<unknown>;
}

export const INTERPRETER = Symbol("INTERPRETER");
