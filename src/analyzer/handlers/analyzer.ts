import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { ChatOpenAI } from "@langchain/openai";
import { AnalysisService } from "../services/analyze-market";
import { AnalysisRepository } from "../services/db";
import { formatAnalysisRecord } from "../services/format-analysis";
import { TechnicalIndicatorService } from "../services/indicators";
import { KrakenService } from "../services/kraken";
import { SlackService } from "../services/slack";
import { AppSecret, isValidOHLCDataInterval } from "../types";

const {
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

      const { detail: { symbol = "BTCUSD", interval: timeInterval = 5 } = {} } =
        event;
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
        // modelName: "o1-preview",
        // modelName: "o1-mini",
        modelName: "gpt-4o",
        // modelName: "gpt-4o-mini",
        apiKey: secret.OPENAI_API_KEY,
        temperature: 0.3,
      });

      logger.info("Getting price data");
      const krakenService = new KrakenService(
        symbol,
        interval,
        logger,
        metrics,
        secret.TOTAL_PERIODS
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
        metrics,
        secret.TOTAL_PERIODS
      );
      const indicatorResult = indicatorService.calculateIndicators(priceData);
      logger.info("indicatorResult", { indicatorResult });

      logger.info("Analyzing indicator results");
      const analysisService = new AnalysisService(model, logger, metrics);
      const analysis = await analysisService.analyzeMarket(indicatorResult);
      logger.info("analysis", { analysis });

      // Create record
      const dbTable = `${serviceName}-${environmentName}-table`;
      const repository = new AnalysisRepository(dbTable, logger);
      await repository.createAnalysisRecord(analysis);

      const formattedMessage = formatAnalysisRecord(analysis);

      logger.info(formattedMessage);

      // Send high confidence alert to Slack
      if (
        analysis.finalAnalysis.confidence >= secret.CONFIDENCE_THRESHOLD &&
        analysis.finalAnalysis.recommendation !== "HOLD"
      ) {
        const slackService = new SlackService(
          secret.SLACK_TOKEN,
          secret.SLACK_CHANNEL,
          logger
        );
        await slackService.sendHighConfidenceAlert(analysis, formattedMessage);
      }

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
