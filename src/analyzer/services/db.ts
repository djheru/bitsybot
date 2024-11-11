import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuid } from "uuid";

const { TABLE_NAME: TableName } = process.env;

export interface ITodo {
  id: string;
  userId: string;
  title: string;
  description: string;
  completed: boolean;
  createdDate: string;
  dueDate: string;
}

const dynamodbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(dynamodbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const createKeys = (todo: ITodo) => ({
  pk: `todo|${todo.userId}`,
  sk: `${todo.createdDate}|${todo.title}`,
  gsipk1: `todo|${todo.id}`,
  lsi1: `${todo.dueDate}|${todo.title}`,
  lsi2: `${todo.title}|${todo.dueDate}`,
});

export const createTodo = async (todo: Omit<ITodo, "id">): Promise<ITodo> => {
  const newTodo: ITodo = {
    ...todo,
    id: uuid(),
  };

  const params: PutCommandInput = {
    TableName,
    Item: {
      ...createKeys(newTodo),
      ...newTodo,
    },
  };

  await ddbDocClient.send(new PutCommand(params));
  return newTodo;
};

export const getTodo = async (id: string, userId: string): Promise<ITodo> => {
  const params = {
    TableName,
    IndexName: "gsi1",
    KeyConditionExpression: "gsipk1 = :gsipk1",
    ExpressionAttributeValues: {
      ":gsipk1": `todo|${id}`,
    },
  };

  const result = await ddbDocClient.send(new QueryCommand(params));
  if (!result.Items?.length) {
    throw new Error("Todo not found");
  }

  const todo: ITodo = result.Items[0] as ITodo;
  if (todo.userId !== userId) {
    throw new Error("Forbidden");
  }

  return todo;
};

export const listByCreatedDate = async (
  userId: string,
  start: string,
  end?: string,
  nextToken?: string,
  limit = 10,
  direction = "asc"
): Promise<ITodo[]> => {
  const params = {
    TableName,
    KeyConditionExpression: end
      ? "pk = :pk and sk between :start and :end"
      : `pk = :pk and ${direction === "asc" ? "sk >" : "sk <"} :start`,
    ExpressionAttributeValues: {
      ":pk": `todo|${userId}`,
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
  return (result.Items || []) as ITodo[];
};

export const listByDueDate = async (
  userId: string,
  start: string,
  end?: string,
  nextToken?: string,
  limit = 10,
  direction = "asc"
): Promise<ITodo[]> => {
  const params: any = {
    TableName,
    IndexName: "lsi1",
    KeyConditionExpression: end
      ? "pk = :pk and lsi1 between :start and :end"
      : `pk = :pk and ${direction === "asc" ? "lsi1 >" : "lsi1 <"} :start`,
    ExpressionAttributeValues: {
      ":pk": `todo|${userId}`,
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
  return (result.Items || []) as ITodo[];
};

export const findByTitle = async (
  userId: string,
  titleContains: string,
  nextToken?: string,
  limit = 10,
  direction = "asc"
): Promise<ITodo[]> => {
  const params = {
    TableName,
    IndexName: "lsi2",
    KeyConditionExpression: "pk = :pk and contains(lsi2, :title)",
    ExpressionAttributeValues: {
      ":pk": `todo|${userId}`,
      ":title": titleContains,
    },
    Limit: limit,
    ScanIndexForward: direction === "asc",
    ExclusiveStartKey: nextToken
      ? JSON.parse(Buffer.from(nextToken, "base64").toString())
      : undefined,
  };

  const result = await ddbDocClient.send(new QueryCommand(params));
  return (result.Items || []) as ITodo[];
};

export const updateTodo = async (todo: ITodo): Promise<ITodo> => {
  const params: UpdateCommandInput = {
    TableName,
    Key: {
      pk: `todo|${todo.userId}`,
      sk: `${todo.createdDate}|${todo.title}`,
    },
    UpdateExpression:
      "set description = :description, completed = :completed, dueDate = :dueDate, lsi1 = :lsi1, lsi2 = :lsi2",
    ExpressionAttributeValues: {
      ":description": todo.description,
      ":completed": todo.completed,
      ":dueDate": todo.dueDate,
      ":lsi1": `${todo.dueDate}|${todo.title}`,
      ":lsi2": `${todo.title}|${todo.dueDate}`,
    },
    ReturnValues: "ALL_NEW",
  };

  const result = await ddbDocClient.send(new UpdateCommand(params));
  return result.Attributes as ITodo;
};

export const deleteTodo = async (id: string, userId: string): Promise<void> => {
  // First get the todo to get the key attributes
  const todo = await getTodo(id, userId);

  const params: DeleteCommandInput = {
    TableName,
    Key: {
      pk: `todo|${userId}`,
      sk: `${todo.createdDate}|${todo.title}`,
    },
  };

  await ddbDocClient.send(new DeleteCommand(params));
};
