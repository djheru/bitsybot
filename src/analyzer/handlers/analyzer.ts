import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { ChatOpenAI } from "@langchain/openai";
import { AnalysisService } from "../services/analyze-market";
import { AnalysisRepository } from "../services/db";
import { evaluatePerformance } from "../services/evaluate";
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
} = process.env;

let logger: Logger;
let metrics: Metrics;

export const analyzer = (_logger: Logger, _metrics: Metrics) => {
  logger = _logger;
  metrics = _metrics;
  return async (event: any): Promise<any> => {
    try {
      logger.info("event", { event });

      const dbTable = `${serviceName}-${environmentName}-table`;
      const repository = new AnalysisRepository(dbTable, logger);

      const { symbol = "XBTUSDT", interval: timeInterval = 15 } = event;

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
        // modelName: secret.LLM_MODEL_NAME,
        apiKey: secret.LLM_API_KEY,
        temperature: 0.1,
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
      const indicatorService = new TechnicalIndicatorService();

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
      await repository.createAnalysisRecord(analysis);

      // Check the previous analysis to see if the recommendation or confidence has changed
      const recentAnalyses = await repository.getRecentAnalyses(
        symbol,
        interval,
        1
      );

      const {
        confidence: recentConfidence,
        recommendation: recentRecommendation,
      } = recentAnalyses.length
        ? recentAnalyses[0]
        : { confidence: 0, recommendation: "HOLD" };

      const shouldPublishSlack =
        analysis.confidence >= secret.CONFIDENCE_THRESHOLD &&
        analysis.recommendation !== "HOLD";
      analysis.recommendation !== recentRecommendation &&
        analysis.confidence !== recentConfidence;

      const slackService = new SlackService(
        secret.SLACK_TOKEN,
        secret.SLACK_CHANNEL,
        logger
      );

      const formattedMessages = slackService.formatMessages(analysis);

      logger.info("Formatted slack messages", {
        formattedMessages,
      });

      if (shouldPublishSlack) {
        await slackService.sendHighConfidenceAlert(formattedMessages);
      }

      const evaluation = await evaluatePerformance(
        symbol,
        interval,
        priceData,
        repository,
        logger
      );

      logger.info("Evaluation Summary", { evaluation });

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
