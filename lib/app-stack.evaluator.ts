import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import middy from "@middy/core";
import { evaluator } from "../src/analyzer/handlers/evaluator";

const logger = new Logger();
const metrics = new Metrics();

const handlerFcn = evaluator(logger, metrics);
export const handler = middy(handlerFcn).use(logMetrics(metrics));
