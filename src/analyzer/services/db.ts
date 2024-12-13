import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { DateTime } from "luxon";
import {
  AnalysisRecord,
  EvaluationResult,
  EvaluationSummaryResult,
  OHLCDataInterval,
  Signal,
} from "../types";

type KeyRecord = {
  symbol: string;
  interval: OHLCDataInterval;
  timestamp: string;
  recommendation?: Signal | undefined;
  uuid: string;
};

export class AnalysisRepository {
  private readonly ddbDocClient: DynamoDBDocumentClient;
  private readonly TTL_DAYS = 90; // Configure TTL period

  constructor(
    private readonly tableName: string,
    private readonly logger: Logger
  ) {
    const dynamodbClient = new DynamoDBClient({
      region: "us-east-1",
    });
    this.ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  private calculateTTL(timestamp: string): number {
    const ttlDate = new Date(timestamp);
    ttlDate.setDate(ttlDate.getDate() + this.TTL_DAYS);
    return Math.floor(ttlDate.getTime() / 1000);
  }

  private createKeys(record: KeyRecord, prefix = "analysis") {
    return {
      pk: `${prefix}#${record.symbol}#${record.interval}`,
      sk: `${record.timestamp}#${record.recommendation}`,
      gsipk1: `${prefix}#${record.uuid}`,
      gsisk1: `${record.timestamp}#${record.recommendation}`,
      lsi1: `${record.timestamp}#${record.interval}`,
    };
  }

  async createAnalysisRecord(
    record: Omit<AnalysisRecord, "id">
  ): Promise<AnalysisRecord> {
    try {
      const ttl = this.calculateTTL(record.timestamp);
      const newAnalysisRecord: AnalysisRecord = { ...record, ttl };

      const params: PutCommandInput = {
        TableName: this.tableName,
        Item: {
          ...this.createKeys(newAnalysisRecord),
          ...newAnalysisRecord,
        },
        // Optional: Add condition to prevent overwriting
        ConditionExpression: "attribute_not_exists(gsipk1)",
      };

      await this.ddbDocClient.send(new PutCommand(params));
      this.logger.info("Analysis record created", { uuid: record.uuid });

      return newAnalysisRecord;
    } catch (error) {
      this.logger.error("Failed to create analysis record", { error, record });
      throw error;
    }
  }

  async updateAnalysisRecordWithEvaluation(
    record: EvaluationResult
  ): Promise<AnalysisRecord> {
    try {
      const { symbol, interval, recommendation = "HOLD", timestamp } = record;
      const analysisRecord = await this.getAnalysisRecord({
        symbol,
        interval,
        recommendation: recommendation as Signal,
        timestamp,
      });

      const updatedRecord: AnalysisRecord = {
        ...analysisRecord,
        evaluation: record,
      };

      const params: PutCommandInput = {
        TableName: this.tableName,
        Item: {
          ...this.createKeys(updatedRecord),
          ...updatedRecord,
        },
      };

      await this.ddbDocClient.send(new PutCommand(params));
      this.logger.info("Analysis record updated with evaluation", {
        uuid: record.uuid,
      });

      return updatedRecord;
    } catch (error) {
      this.logger.error("Failed to update analysis record with evaluation", {
        error,
        ...record,
      });
      throw error;
    }
  }

  async createEvaluationRecord(
    record: EvaluationResult
  ): Promise<EvaluationResult> {
    try {
      const ttl = this.calculateTTL(record.timestamp);
      const newEvaluationRecord: EvaluationResult = { ...record, ttl };

      const params: PutCommandInput = {
        TableName: this.tableName,
        Item: {
          ...this.createKeys(newEvaluationRecord, "evaluation"),
          ...newEvaluationRecord,
        },
      };

      await this.ddbDocClient.send(new PutCommand(params));
      this.logger.info("Evaluation record created", { uuid: record.uuid });

      await this.updateAnalysisRecordWithEvaluation(record);

      return newEvaluationRecord;
    } catch (error) {
      this.logger.error("Failed to create evaluation record", {
        error,
        record,
      });
      throw error;
    }
  }

  async createEvaluationSummary(evaluationSummary: EvaluationSummaryResult) {
    try {
      const signals: Signal[] = ["BUY", "HOLD", "SELL"];

      for (const signal of signals) {
        const item = {
          symbol: evaluationSummary.symbol,
          interval: evaluationSummary.interval,
          timestamp: evaluationSummary.timestamp,
          recommendation: signal,
          uuid: evaluationSummary.uuid,
          formattedSummary: evaluationSummary.formattedSummary,
          stats: evaluationSummary[signal],
          total: evaluationSummary.total,
          from: evaluationSummary.range.from,
          to: evaluationSummary.range.to,
        };
        const params: PutCommandInput = {
          TableName: this.tableName,
          Item: {
            ...this.createKeys(item, "evaluation-summary"),
            ...item,
          },
        };

        await this.ddbDocClient.send(new PutCommand(params));
        this.logger.info(`${signal} evaluation summary created`, {
          range: evaluationSummary.range,
          formattedSummary: evaluationSummary.formattedSummary,
        });
      }
    } catch (error) {
      this.logger.error("Failed to create evaluation summary", {
        error,
        evaluationSummary,
      });
      throw error;
    }
  }

  async getAnalysisRecord({
    symbol,
    interval,
    timestamp,
    recommendation,
  }: {
    symbol: string;
    interval: OHLCDataInterval;
    recommendation: Signal;
    timestamp: string;
  }): Promise<AnalysisRecord> {
    try {
      const params: QueryCommandInput = {
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND sk = :sk",
        ExpressionAttributeValues: {
          ":pk": `analysis#${symbol}#${interval}`,
          ":sk": `${timestamp}#${recommendation}`,
        },
      };

      const result = await this.ddbDocClient.send(new QueryCommand(params));

      if (!result.Items?.length) {
        const error = new Error(`Analysis record not found`);
        this.logger.error("Analysis record not found", { params });
        throw error;
      }

      return result.Items[0] as AnalysisRecord;
    } catch (error) {
      this.logger.error("Failed to get analysis record", { error });
      throw error;
    }
  }

  async listByTimestamp<T = AnalysisRecord>(params: {
    symbol: string;
    interval: OHLCDataInterval;
    start: string;
    end?: string;
    nextToken?: string;
    limit?: number;
    prefix?: string;
    direction?: "asc" | "desc";
    recommendation?: Signal;
  }): Promise<{
    records: T[];
    nextToken?: string;
  }> {
    try {
      const {
        symbol,
        interval,
        start,
        end,
        nextToken,
        limit = 10,
        prefix = "analysis",
        direction = "asc",
        recommendation,
      } = params;

      const queryParams: QueryCommandInput = {
        TableName: this.tableName,
        KeyConditionExpression: end
          ? "pk = :pk and sk between :start and :end"
          : `pk = :pk and ${direction === "asc" ? "sk >" : "sk <"} :start`,
        ExpressionAttributeValues: {
          ":pk": `${prefix}#${symbol}#${interval}`,
          ":start": start,
          ...(end && { ":end": end }),
          ...(recommendation && { ":rec": recommendation }),
        },
        ...(recommendation && {
          FilterExpression: "finalRecommendation = :rec",
        }),
        Limit: limit,
        ScanIndexForward: direction === "asc",
        ExclusiveStartKey: nextToken
          ? JSON.parse(Buffer.from(nextToken, "base64").toString())
          : undefined,
      };

      const result = await this.ddbDocClient.send(
        new QueryCommand(queryParams)
      );

      return {
        records: (result.Items || []) as T[],
        nextToken: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
              "base64"
            )
          : undefined,
      };
    } catch (error) {
      this.logger.error("Failed to list analysis records", {
        error,
        ...params,
      });
      throw error;
    }
  }

  async getRecentAnalyses(
    symbol: string,
    interval: OHLCDataInterval = 15,
    limit = 10,
    start: string = DateTime.now().toISO()
  ): Promise<AnalysisRecord[]> {
    return (
      await this.listByTimestamp<AnalysisRecord>({
        symbol,
        interval,
        start,
        limit,
        direction: "desc",
      })
    ).records;
  }
}
