import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnit } from "@aws-lambda-powertools/metrics";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {
  AnalysisError,
  AnalysisState,
  AnalysisType,
  validateAnalysisSummary,
  validatePriceData,
  ValidationError,
} from "../types";

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
      logger.info("event", event);

      const secretString = await getSecret(`${serviceName}-${environmentName}`);
      if (!secretString) {
        throw new Error("Secret not found");
      }
      const secret = JSON.parse(`${secretString}`);
      logger.info("secret", { secret: secret.OPENAI_API_KEY });

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
};

export const fetchPriceData = (state: AnalysisState) => {
  try {
    logger.info("Fetching price data");
    metrics.addMetric("fetchPriceDataAttempts", MetricUnit.Count, 1);

    // TODO: Implement Kraken API call
    const mockData = [
      {
        timestamp: Date.now(),
        open: 40000,
        high: 41000,
        low: 39000,
        close: 40500,
        volume: 100,
      },
    ];

    // Validate the data
    const validatedData = validatePriceData(mockData);

    metrics.addMetric("fetchPriceDataSuccess", MetricUnit.Count, 1);
    return {
      ...state,
      price_data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Invalid price data format:", { error: error.errors });
      metrics.addMetric("fetchPriceDataValidationErrors", MetricUnit.Count, 1);
      throw new ValidationError("Invalid price data format", error.errors);
    }
    logger.error("Error fetching price data:", { error });
    metrics.addMetric("fetchPriceDataErrors", MetricUnit.Count, 1);
    throw error;
  }
};

export const createAnalysisFunction = (
  analysisType: AnalysisType,
  prompt: string,
  model: ChatOpenAI
) => {
  return async (state: AnalysisState) => {
    try {
      logger.info(`Starting ${analysisType} analysis`);
      metrics.addMetric(`${analysisType}AnalysisAttempts`, MetricUnit.Count, 1);

      const promptTemplate = ChatPromptTemplate.fromTemplate(prompt);
      const chain = promptTemplate.pipe(model);

      const response = await chain.invoke({
        price_data: JSON.stringify(state.price_data, null, 2),
      });

      // Parse and validate the analysis summary
      const analysis = validateAnalysisSummary({
        signal: "HOLD", // TODO: Parse from response
        confidence: 0.7,
        reasoning: response.content,
      });

      metrics.addMetric(`${analysisType}AnalysisSuccess`, MetricUnit.Count, 1);

      return {
        ...state,
        analyses: {
          ...state.analyses,
          [analysisType]: analysis,
        },
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error(`Invalid ${analysisType} analysis format:`, {
          error: error.errors,
        });
        metrics.addMetric(
          `${analysisType}AnalysisValidationErrors`,
          MetricUnit.Count,
          1
        );
        throw new ValidationError(
          `Invalid ${analysisType} analysis format`,
          error.errors
        );
      }
      logger.error(`Error in ${analysisType} analysis:`, { error });
      metrics.addMetric(`${analysisType}AnalysisErrors`, MetricUnit.Count, 1);
      throw new AnalysisError(
        `Error in ${analysisType} analysis`,
        analysisType,
        error
      );
    }
  };
};
