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
  OHLCDataInterval,
  Signal,
} from "../types";

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

  private createKeys(
    record: AnalysisRecord | EvaluationResult,
    prefix = "analysis"
  ) {
    return {
      pk: `${prefix}#${record.symbol}#${record.interval}`,
      sk: `${record.timestamp}#${record.recommendation}`,
      gsipk1: `${prefix}#${record.uuid}`,
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
        // Optional: Add condition to prevent overwriting
        ConditionExpression: "attribute_not_exists(gsipk1)",
      };

      await this.ddbDocClient.send(new PutCommand(params));
      this.logger.info("Analysis record created", { uuid: record.uuid });

      return newEvaluationRecord;
    } catch (error) {
      this.logger.error("Failed to create evaluation record", {
        error,
        record,
      });
      throw error;
    }
  }

  async getAnalysisRecord(uuid: string): Promise<AnalysisRecord> {
    try {
      const params: QueryCommandInput = {
        TableName: this.tableName,
        IndexName: "gsi1",
        KeyConditionExpression: "gsipk1 = :gsipk1",
        ExpressionAttributeValues: {
          ":gsipk1": `analysis#${uuid}`,
        },
      };

      const result = await this.ddbDocClient.send(new QueryCommand(params));

      if (!result.Items?.length) {
        const error = new Error(`Analysis record not found: ${uuid}`);
        this.logger.error("Analysis record not found", { uuid });
        throw error;
      }

      return result.Items[0] as AnalysisRecord;
    } catch (error) {
      this.logger.error("Failed to get analysis record", { error, uuid });
      throw error;
    }
  }

  async listByTimestamp(params: {
    symbol: string;
    interval: OHLCDataInterval;
    start: string;
    end?: string;
    nextToken?: string;
    limit?: number;
    direction?: "asc" | "desc";
    recommendation?: Signal;
  }): Promise<{
    records: AnalysisRecord[];
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
        direction = "asc",
        recommendation,
      } = params;

      const queryParams: QueryCommandInput = {
        TableName: this.tableName,
        KeyConditionExpression: end
          ? "pk = :pk and sk between :start and :end"
          : `pk = :pk and ${direction === "asc" ? "sk >" : "sk <"} :start`,
        ExpressionAttributeValues: {
          ":pk": `analysis#${symbol}#${interval}`,
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
        records: (result.Items || []) as AnalysisRecord[],
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
      await this.listByTimestamp({
        symbol,
        interval,
        start,
        limit,
        direction: "desc",
      })
    ).records;
  }
}
