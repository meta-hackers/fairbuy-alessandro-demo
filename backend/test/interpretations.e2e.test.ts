import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { AppModule, configureApp } from "../src/app.module.js";
import { INTERPRETER, type Interpreter } from "../src/interpretations/interpreter.js";

async function createApp(interpreter?: Interpreter): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (interpreter) builder = builder.overrideProvider(INTERPRETER).useValue(interpreter);
  const app = (await builder.compile()).createNestApplication({ logger: false });
  configureApp(app, {});
  await app.init();
  return app;
}

describe("interpretations API", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("proposes the demo constraints for the demo request", async () => {
    app = await createApp();
    const res = await request(app.getHttpServer())
      .post("/v1/interpretations")
      .send({ text: "Cerco un portatile usato per programmare, almeno 16 GB di RAM, massimo 700 € consegnato, meglio col caricatore" })
      .expect(200);

    expect(res.body.interpreter).toBe("keyword");
    expect(res.body.category).toBe("laptop");
    expect(res.body.constraints).toHaveLength(3);
    expect(res.body.constraints).toContainEqual({ attribute: "total", op: "<=", value: 70000, hard: true });
    expect(res.body.textRequirements).toEqual(["Cerco un portatile usato per programmare"]);
  });

  it("feeds a comparison directly", async () => {
    app = await createApp();
    const proposal = await request(app.getHttpServer()).post("/v1/interpretations").send({ text: "laptop, at least 16 GB RAM, max 700 €" }).expect(200);
    const comparison = await request(app.getHttpServer())
      .post("/v1/comparisons")
      .send({ category: proposal.body.category, constraints: proposal.body.constraints })
      .expect(201);
    expect(comparison.body.result.ranked[0].offerId).toBe("fixture-a");
  });

  it.each([
    ["empty text", { text: "   " }],
    ["text over the limit", { text: "a".repeat(2001) }],
    ["unknown fields", { text: "laptop", category: "laptop" }],
  ])("rejects %s", async (_, body) => {
    app = await createApp();
    await request(app.getHttpServer()).post("/v1/interpretations").send(body).expect(400);
  });

  it("answers 502 when the interpreter returns malformed output", async () => {
    app = await createApp({ id: "broken", interpret: async () => ({ category: 42 }) });
    const res = await request(app.getHttpServer()).post("/v1/interpretations").send({ text: "laptop" }).expect(502);
    expect(res.body.message).toBe("The interpreter returned an invalid response.");
  });

  it("drops constraints the category cannot evaluate", async () => {
    const interpreter: Interpreter = {
      id: "model",
      interpret: async () => ({
        category: "laptop",
        constraints: [
          { attribute: "ramGb", op: ">=", value: 16, hard: true },
          { attribute: "gpu", op: "=", value: "RTX 4060", hard: true },
        ],
        textRequirements: [],
      }),
    };
    app = await createApp(interpreter);
    const res = await request(app.getHttpServer()).post("/v1/interpretations").send({ text: "laptop" }).expect(200);
    expect(res.body.constraints).toEqual([{ attribute: "ramGb", op: ">=", value: 16, hard: true }]);
    expect(res.body.notes).toHaveLength(1);
  });
});
