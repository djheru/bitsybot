import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import middy from "@middy/core";

const {
  DB_TABLE: dbTable = "",
  ENVIRONMENT_NAME: environmentName = "",
  SERVICE_NAME: serviceName = "",
} = process.env;

const logger = new Logger();
const metrics = new Metrics();

export const handlerFcn = async (event: any): Promise<any> => {
  try {
    logger.info("event", event);

    const secretString = await getSecret(`${serviceName}-${environmentName}`);
    if (!secretString) {
      throw new Error("Secret not found");
    }
    logger.info("secretString", { secretString });
    const secret = JSON.parse(`${secretString}`);
    logger.info("secret", { secret });

    metrics.addDimension("environment", environmentName);
    metrics.addMetric("handlerInvoked", MetricUnit.Count, 1);

    metrics.publishStoredMetrics();
    return {
      statusCode: 200,
      body: JSON.stringify(event),
    };
  } catch (error) {
    const err = error as Error;
    logger.error("Lambda execution failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error, message: "Lambda execution failed" }),
    };
  }
};
export const handler = middy(handlerFcn).use(logMetrics(metrics));
