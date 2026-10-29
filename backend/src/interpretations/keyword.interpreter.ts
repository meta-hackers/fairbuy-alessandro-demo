import { Injectable } from "@nestjs/common";
import { interpretKeywords, KEYWORD_INTERPRETER, type CategorySpec } from "@fairbuy/core";
import type { Interpreter } from "./interpreter.js";

// Stand-in until model access is confirmed (meta-hackers/fairbuy#3): same interface,
// so the model-backed interpreter replaces it in app.module.ts only.
@Injectable()
export class KeywordInterpreter implements Interpreter {
  readonly id = KEYWORD_INTERPRETER;

  async interpret(text: string, specs: Readonly<Record<string, CategorySpec>>): Promise<unknown> {
    return interpretKeywords(text, specs);
  }
}
