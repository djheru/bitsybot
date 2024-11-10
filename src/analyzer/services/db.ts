// import { Logger } from "@aws-lambda-powertools/logger";
// import { Metrics } from "@aws-lambda-powertools/metrics";
// import { AnalysisRecord } from "../types";

export class AnalysisRepository {
  // constructor(
  //   private readonly tableName: string,
  //   private readonly dynamoDb: DocumentClient,
  //   private readonly logger: Logger,
  //   private readonly metrics: Metrics
  // ) {}
  // async saveAnalysis(analysis: AnalysisRecord): Promise<void> {
  //   const params = {
  //     TableName: this.tableName,
  //     Item: {
  //       ...analysis,
  //       recommendationTimestamp: `${analysis.finalRecommendation.recommendation}-${analysis.timestamp}`,
  //     },
  //   };
  //   try {
  //     await this.dynamoDb.put(params).promise();
  //     this.logger.info("Analysis saved successfully", {
  //       symbol: analysis.symbol,
  //     });
  //   } catch (error) {
  //     this.logger.error("Failed to save analysis", {
  //       error,
  //       symbol: analysis.symbol,
  //     });
  //     throw error;
  //   }
  // }
  // async getRecentAnalyses(
  //   symbol: string,
  //   limit: number = 10
  // ): Promise<AnalysisRecord[]> {
  //   const params = {
  //     TableName: this.tableName,
  //     KeyConditionExpression: "symbol = :symbol",
  //     ExpressionAttributeValues: {
  //       ":symbol": symbol,
  //     },
  //     Limit: limit,
  //     ScanIndexForward: false, // Get most recent first
  //   };
  //   try {
  //     const result = await this.dynamoDb.query(params).promise();
  //     return result.Items as AnalysisRecord[];
  //   } catch (error) {
  //     this.logger.error("Failed to get recent analyses", { error, symbol });
  //     throw error;
  //   }
  // }
  // async getAnalysesByRecommendation(
  //   symbol: string,
  //   recommendation: string,
  //   startTime: number,
  //   endTime: number
  // ): Promise<AnalysisRecord[]> {
  //   const params = {
  //     TableName: this.tableName,
  //     IndexName: "RecommendationTimestampIndex",
  //     KeyConditionExpression:
  //       "symbol = :symbol and begins_with(recommendationTimestamp, :rec)",
  //     ExpressionAttributeValues: {
  //       ":symbol": symbol,
  //       ":rec": recommendation,
  //     },
  //     FilterExpression: "timestamp BETWEEN :start AND :end",
  //     ExpressionAttributeValues: {
  //       ":start": startTime,
  //       ":end": endTime,
  //     },
  //   };
  //   try {
  //     const result = await this.dynamoDb.query(params).promise();
  //     return result.Items as AnalysisRecord[];
  //   } catch (error) {
  //     this.logger.error("Failed to get analyses by recommendation", {
  //       error,
  //       symbol,
  //       recommendation,
  //     });
  //     throw error;
  //   }
  // }
}
