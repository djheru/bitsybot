import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { AnalysisRecord } from "../types";

const { TABLE_NAME: TableName } = process.env;

const dynamodbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const createKeys = (analysisRecord: AnalysisRecord) => ({
  pk: `analysisRecord|${analysisRecord.symbol}`,
  sk: `${analysisRecord.timestamp}|${analysisRecord.finalRecommendation}`,
  gsipk1: `analysisRecord|${analysisRecord.uuid}`,
  lsi1: `${analysisRecord.timestamp}|${analysisRecord.interval}`,
});

export const createAnalysisRecord = async (
  analysisrecord: Omit<AnalysisRecord, "id">
): Promise<AnalysisRecord> => {
  const newAnalysisRecord: AnalysisRecord = {
    ...analysisrecord,
  };

  const params: PutCommandInput = {
    TableName,
    Item: {
      ...createKeys(newAnalysisRecord),
      ...newAnalysisRecord,
    },
  };

  await ddbDocClient.send(new PutCommand(params));
  return newAnalysisRecord;
};

export const getAnalysisRecord = async (
  uuid: string
): Promise<AnalysisRecord> => {
  const params = {
    TableName,
    IndexName: "gsi1",
    KeyConditionExpression: "gsipk1 = :gsipk1",
    ExpressionAttributeValues: {
      ":gsipk1": `analysisrecord|${uuid}`,
    },
  };

  const result = await ddbDocClient.send(new QueryCommand(params));
  if (!result.Items?.length) {
    throw new Error("AnalysisRecord not found");
  }

  const analysisrecord: AnalysisRecord = result.Items[0] as AnalysisRecord;
  return analysisrecord;
};

export const listByTimestamp = async (
  symbol: string,
  start: string,
  end?: string,
  nextToken?: string,
  limit = 10,
  direction = "asc"
): Promise<AnalysisRecord[]> => {
  const params = {
    TableName,
    KeyConditionExpression: end
      ? "pk = :pk and sk between :start and :end"
      : `pk = :pk and ${direction === "asc" ? "sk >" : "sk <"} :start`,
    ExpressionAttributeValues: {
      ":pk": `analysisrecord|${symbol}`,
      ":start": start,
      ...(end && { ":end": end }),
    },
    Limit: limit,
    ScanIndexForward: direction === "asc",
    ExclusiveStartKey: nextToken
      ? JSON.parse(Buffer.from(nextToken, "base64").toString())
      : undefined,
  };

  const result = await ddbDocClient.send(new QueryCommand(params));
  return (result.Items || []) as AnalysisRecord[];
};
