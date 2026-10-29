import { BadGatewayException, Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { categorySpecs, InterpretRequestSchema, validateInterpretation, type Interpretation, type InterpretRequest } from "@fairbuy/core";
import { ZodValidationPipe } from "../zod-validation.pipe.js";
import { INTERPRETER, type Interpreter } from "./interpreter.js";

@Controller("v1/interpretations")
export class InterpretationsController {
  constructor(@Inject(INTERPRETER) private readonly interpreter: Interpreter) {}

  // Proposes a category and constraints for the user to review. Nothing is stored:
  // the user confirms or edits the proposal, then creates a comparison.
  @Post()
  @HttpCode(200)
  async create(@Body(new ZodValidationPipe(InterpretRequestSchema)) body: InterpretRequest): Promise<Interpretation> {
    const raw = await this.interpreter.interpret(body.text, categorySpecs);
    try {
      return validateInterpretation(raw, categorySpecs, this.interpreter.id);
    } catch {
      // Malformed interpreter output is an upstream failure, not the client's fault.
      throw new BadGatewayException("The interpreter returned an invalid response.");
    }
  }
}
