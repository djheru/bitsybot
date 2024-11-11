import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { ChatOpenAI } from "@langchain/openai";
import { AnalysisService } from "../services/analyze-market";
import { AnalysisRepository } from "../services/db";
import { TechnicalIndicatorService } from "../services/indicators";
import { KrakenService } from "../services/kraken";
import { AppSecret, isValidOHLCDataInterval } from "../types";

const {
  DB_TABLE: dbTable = "",
  ENVIRONMENT_NAME: environmentName = "",
  SERVICE_NAME: serviceName = "",
} = process.env;

let logger: Logger;
let metrics: Metrics;

export const analyzer = (_logger: Logger, _metrics: Metrics) => {
  logger = _logger;
  metrics = _metrics;
  return async (event: any): Promise<any> => {
    try {
      logger.info("event", { event });

      const {
        detail: { symbol = "BTCUSD", interval: timeInterval = 15 } = {},
      } = event;
      const interval = isValidOHLCDataInterval(timeInterval)
        ? timeInterval
        : 15;

      logger.info("Analyzing symbol", { symbol, interval });

      const secret = await getSecret<AppSecret>(
        `${serviceName}-${environmentName}`,
        { transform: "json" }
      );

      if (!secret) {
        throw new Error("Secret not found");
      }

      metrics.addDimension("environment", environmentName);
      metrics.addMetric("handlerInvoked", MetricUnit.Count, 1);

      const model = new ChatOpenAI({
        modelName: "gpt-4o",
        apiKey: secret.OPENAI_API_KEY,
        temperature: 0.3,
      });

      logger.info("Getting price data");
      const krakenService = new KrakenService(
        symbol,
        interval,
        logger,
        metrics
      );
      const priceData = await krakenService.fetchPriceData();
      logger.info("priceData", {
        priceData: `${priceData.length} records returned`,
      });

      logger.info("Calculating technical indicators");
      const indicatorService = new TechnicalIndicatorService(
        symbol,
        interval,
        logger,
        metrics
      );
      const indicatorResult =
        indicatorService.calculateAllIndicators(priceData);
      logger.info("indicatorResult", { indicatorResult });

      logger.info("Analyzing indicator results");
      const analysisService = new AnalysisService(model, logger, metrics);
      const analysis = await analysisService.analyzeMarket(indicatorResult);
      logger.info("analysis", { analysis });

      // Create record
      const repository = new AnalysisRepository(dbTable, logger);
      await repository.createAnalysisRecord(analysis);

      return {
        statusCode: 200,
        body: JSON.stringify({ event, analysis }),
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
