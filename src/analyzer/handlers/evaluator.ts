import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { AlpacaService } from "../services/alpaca";
import { AnalysisRepository } from "../services/db";
import { evaluatePerformance } from "../services/evaluate";
import { SlackService } from "../services/slack";
import { AppSecret, isValidOHLCDataInterval } from "../types";

const {
  ENVIRONMENT_NAME: environmentName = "",
  SERVICE_NAME: serviceName = "",
} = process.env;

let logger: Logger;
let metrics: Metrics;

export const evaluator = (_logger: Logger, _metrics: Metrics) => {
  logger = _logger;
  metrics = _metrics;
  return async (event: any): Promise<any> => {
    try {
      logger.info("event", { event });

      const { symbol = "XBTUSDT", interval: timeInterval = 15 } = event;

      const interval = isValidOHLCDataInterval(timeInterval)
        ? timeInterval
        : 15;

      logger.info("Evaluating recommendations", { symbol, interval });

      const secret = await getSecret<AppSecret>(
        `${serviceName}-${environmentName}`,
        { transform: "json" }
      );

      if (!secret) {
        throw new Error("Secret not found");
      }

      metrics.addDimension("environment", environmentName);
      metrics.addMetric("handlerInvoked", MetricUnit.Count, 1);

      logger.info("Getting price data");
      const marketService = new AlpacaService({
        pair: symbol,
        interval,
        logger,
        metrics,
        totalPeriods: secret.TOTAL_PERIODS,
        secret,
      });
      const priceData = await marketService.fetchPriceData();

      logger.info("priceData", {
        priceData: `${priceData.close.length} records returned`,
      });

      const slackService = new SlackService(
        secret.SLACK_TOKEN,
        secret.SLACK_CHANNEL,
        logger
      );

      // Check the previous analysis to see if the recommendation or confidence has changed
      const dbTable = `${serviceName}-${environmentName}-table`;
      const repository = new AnalysisRepository(dbTable, logger);
      const evaluation = await evaluatePerformance(
        symbol,
        interval,
        priceData,
        repository,
        slackService,
        logger
      );

      logger.info("Evaluation Summary", { evaluation });

      return {
        statusCode: 200,
        body: JSON.stringify({ event, evaluation }),
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
};
