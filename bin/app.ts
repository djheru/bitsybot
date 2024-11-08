#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import { pascalCase } from "change-case";
import * as dotenv from "dotenv";
import "source-map-support/register";
import { PipelineStack } from "../lib/pipeline-stack";
dotenv.config({ path: ".env" });

export type Environment = "dev" | "prod" | "test" | string;

/**
 * Application Infrastructure Stack
 *
 * Summary: This stack provides the infrastructure to support the AWS application.
 *
 * Deployment: This stack supports deployments to the standard environments. The stack
 * be deployed by first, logging in to SSO using `aws sso login --profile dev` (or test,
 * prod, etc), then running `npx cdk-sso-sync dev` to associate the CDK tool with the
 * selected environment. Once you're logged in, you can use the following command to
 * deploy:
 *
 * `npm run build && cdk synth -q && cdk deploy --profile dev`
 */
const {
  AWS_DEFAULT_ACCOUNT_ID = "",
  AWS_DEFAULT_REGION = "",
  CDK_DEFAULT_ACCOUNT = "",
  CDK_DEFAULT_REGION = "",
  CDK_ENV: environmentName = "dev",
  CODESTAR_CONNECTION_ARN: connectionArn = "",
  DEPLOY_BRANCH: deployBranch = "main",
  GITHUB_OWNER: repoOwner = "",
  GITHUB_REPO: repoName = "",
  ORG_NAME: orgName = "",
  SERVICE_NAME: serviceName = "",
} = process.env;

const account = CDK_DEFAULT_ACCOUNT || AWS_DEFAULT_ACCOUNT_ID;
const region = CDK_DEFAULT_REGION || AWS_DEFAULT_REGION;

const requiredValues = {
  account,
  connectionArn,
  deployBranch,
  environmentName,
  orgName,
  region,
  repoName,
  repoOwner,
  serviceName,
};

if (!Object.values(requiredValues).every((value) => !!value)) {
  console.log("Error - Missing reqired values: %j", requiredValues);
  throw new Error("Missing required values");
}

const cicdEnvironmentVariables = {
  AWS_DEFAULT_ACCOUNT_ID,
  AWS_DEFAULT_REGION,
  CDK_DEFAULT_ACCOUNT,
  CDK_DEFAULT_REGION,
  CDK_ENV: environmentName,
  CODESTAR_CONNECTION_ARN: connectionArn,
  DEPLOY_BRANCH: deployBranch,
  GITHUB_OWNER: repoOwner,
  GITHUB_REPO: repoName,
  ORG_NAME: orgName,
  SERVICE_NAME: serviceName,
};

const app = new App();
const patientStack = new PipelineStack(
  app,
  `${serviceName}-${environmentName}`,
  {
    description: `Summary: This stack is responsible for handling the ${pascalCase(
      serviceName
    )} application resources.
   Deployment: This stack supports deployments to the standard environments. The stack
   can be deployed to a custom environment (e.g. a developer environment) by ensuring
   that the desired environment name (e.g. ${environmentName}) is set in the $CDK_ENV environment
   variable for the machine that is deploying the stack.`,
    cicdEnvironmentVariables,
    connectionArn,
    env: { account, region },
    environmentName,
    serviceName,
    orgName,
    repoName,
    repoOwner,
    deployBranch,
  }
);

// Tag the stacks and all of the nested constructs
Tags.of(patientStack).add("serviceName", serviceName);
Tags.of(patientStack).add("environmentName", environmentName);
