import { Stage, StageProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment } from '../bin/app';
import { AppStack, AppStackProps } from './app-stack';

export interface AppStageProps extends StageProps {
  environmentName: Environment;
  appStackProps: AppStackProps;
}

export class AppStage extends Stage {
  constructor(scope: Construct, id: string, props: AppStageProps) {
    super(scope, id, props);

    const appStackId = `${props.appStackProps.serviceName}-${props.environmentName}`;
    new AppStack(this, appStackId, props.appStackProps);
  }
}
