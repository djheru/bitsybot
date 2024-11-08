import { Stack, StackProps } from "aws-cdk-lib";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { Environment } from "../bin/app";
import { AppStage } from "./app-stage";

export interface PipelineStackProps extends StackProps {
  cicdEnvironmentVariables: Record<string, string>;
  connectionArn: string;
  deployBranch: string;
  environmentName: Environment;
  orgName: string;
  repoName: string;
  repoOwner: string;
  serviceName: string;
}
export class PipelineStack extends Stack {
  constructor(
    scope: Construct,
    public readonly id: string,
    public readonly props: PipelineStackProps
  ) {
    super(scope, id, props);

    const input = CodePipelineSource.connection(
      `${props.repoOwner}/${props.repoName}`,
      props.deployBranch,
      {
        connectionArn: props.connectionArn,
      }
    );
    const pipeline = new CodePipeline(this, "Pipeline", {
      pipelineName: `${props.serviceName}-${props.environmentName}`,
      synth: new ShellStep("Synth", {
        input,
        installCommands: ["npm ci"],
        commands: ["npm run build", "npx cdk synth"],
        env: {
          ...props.cicdEnvironmentVariables,
        },
      }),
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
    });

    const stage = new AppStage(this, "Application", {
      environmentName: props.environmentName,
      appStackProps: {
        environmentName: props.environmentName,
        serviceName: props.serviceName,
      },
    });

    pipeline.addStage(stage);
  }
}
