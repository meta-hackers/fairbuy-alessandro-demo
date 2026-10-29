import "reflect-metadata";
import { Module, type INestApplication } from "@nestjs/common";
import { ComparisonStore } from "./comparisons/comparison.store.js";
import { ComparisonsController } from "./comparisons/comparisons.controller.js";
import { ComparisonsService } from "./comparisons/comparisons.service.js";
import { CONNECTOR } from "./connectors/connector.js";
import { FixtureConnector } from "./connectors/fixture.connector.js";
import { HealthController } from "./health.controller.js";
import { INTERPRETER } from "./interpretations/interpreter.js";
import { InterpretationsController } from "./interpretations/interpretations.controller.js";
import { KeywordInterpreter } from "./interpretations/keyword.interpreter.js";

@Module({
  controllers: [HealthController, ComparisonsController, InterpretationsController],
  providers: [
    ComparisonsService,
    ComparisonStore,
    { provide: CONNECTOR, useClass: FixtureConnector },
    { provide: INTERPRETER, useClass: KeywordInterpreter },
  ],
})
export class AppModule {}

// Shared by main.ts and the e2e tests, so tests run the same app configuration.
export function configureApp(app: INestApplication, env: NodeJS.ProcessEnv = process.env): void {
  const origins = env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];
  if (origins.length > 0) {
    app.enableCors({ origin: origins });
  }
  app.enableShutdownHooks();
}
