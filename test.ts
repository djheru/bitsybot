import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

import { handler } from "./lib/app-stack.analyzer";

(async () => {
  await handler(
    {},
    {
      callbackWaitsForEmptyEventLoop: false,
      clientContext: undefined,
      functionName: "analyzer",
      functionVersion: "1",
      invokedFunctionArn:
        "arn:aws:lambda:us-east-1:123456789012:function:analyzer",
      memoryLimitInMB: "128",
      awsRequestId: "1234567890",
      logGroupName: "/aws/lambda/analyzer",
      logStreamName: "2022/01/01/[$LATEST]1234567890",
      getRemainingTimeInMillis: () => 1000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    }
  );
})();
