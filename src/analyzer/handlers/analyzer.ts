import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { ChatOpenAI } from "@langchain/openai";
import { AnalysisService } from "../services/analyze-market";
import { AnalysisRepository } from "../services/db";
import { slackFormat } from "../services/format-analysis";
import { TechnicalIndicatorService } from "../services/indicators";
import { KrakenService } from "../services/kraken";
import { SlackService } from "../services/slack";
import {
  AppSecret,
  CalculatedIndicators,
  isValidOHLCDataInterval,
} from "../types";

const {
  ENVIRONMENT_NAME: environmentName = "",
  SERVICE_NAME: serviceName = "",
  // USE_MOCK_DATA = "false",
} = process.env;

// const useMockData = USE_MOCK_DATA === "true";

let logger: Logger;
let metrics: Metrics;

export const analyzer = (_logger: Logger, _metrics: Metrics) => {
  logger = _logger;
  metrics = _metrics;
  return async (event: any): Promise<any> => {
    try {
      logger.info("event", { event });

      const {
        detail: { symbol = "BTCUSDT", interval: timeInterval = 15 } = {},
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
        priceData: `${priceData.close.length} records returned`,
      });

      logger.info("Calculating technical indicators");
      const indicatorService = new TechnicalIndicatorService(
        symbol,
        interval,
        logger,
        metrics
      );
      const indicatorResult: CalculatedIndicators =
        indicatorService.calculateIndicators(priceData);
      logger.info("indicatorResult", { indicatorResult });

      logger.info("Analyzing indicator results");
      const analysisService = new AnalysisService(
        symbol,
        interval,
        model,
        logger,
        metrics
      );
      const analysis = await analysisService.analyzeMarket(indicatorResult);
      logger.info("analysis", { analysis });

      // Create record
      const dbTable = `${serviceName}-${environmentName}-table`;
      const repository = new AnalysisRepository(dbTable, logger);
      await repository.createAnalysisRecord(analysis);

      const formattedMessage = slackFormat(analysis);

      logger.info("Formatted slack message", {
        formattedMessage,
      });

      // Send high confidence alert to Slack
      let shouldPublishSlack =
        analysis.confidence >= secret.CONFIDENCE_THRESHOLD &&
        analysis.recommendation !== "HOLD";

      const recentAnalyses = await repository.getRecentAnalyses(
        symbol,
        interval,
        1
      );

      if (recentAnalyses.length) {
        const recentAnalysis = recentAnalyses[0];
        const recentConfidence = recentAnalysis?.confidence || 0;
        const recentRecommendation = recentAnalysis?.recommendation || "HOLD";

        shouldPublishSlack =
          shouldPublishSlack &&
          analysis.recommendation !== recentRecommendation && // Don't publish if recommendation is the same
          analysis.confidence !== recentConfidence; // Don't publish if confidence is the same
      }

      if (shouldPublishSlack) {
        const slackService = new SlackService(
          secret.SLACK_TOKEN,
          secret.SLACK_CHANNEL,
          logger
        );
        await slackService.sendHighConfidenceAlert(analysis, formattedMessage);
      }

      // const evaluator = new SignalEvaluator(logger, krakenService, repository);
      // const start = DateTime.utc().minus({ hours: 1 }).toISO();
      // const end = DateTime.utc().toISO();
      // logger.info("Evaluating historical signals", { start, end, symbol });
      // const summary = await evaluator.evaluateHistoricalSignals(
      //   start,
      //   end,
      //   symbol
      // );

      // logger.info("Summary", { summary });

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
