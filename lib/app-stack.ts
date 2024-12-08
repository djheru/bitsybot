import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  AttributeType,
  Billing,
  StreamViewType,
  TableV2,
} from "aws-cdk-lib/aws-dynamodb";
import {
  EventBus,
  Rule,
  RuleTargetInput,
  Schedule,
} from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { Environment } from "../bin/app";

export interface AppStackProps extends StackProps {
  environmentName: Environment;
  serviceName: string;
}

export class AppStack extends Stack {
  public eventBus: EventBus;
  public invokeHandlerRule: Rule;
  public dbTable: TableV2;
  public analyzerFunction: NodejsFunction;
  public evaluatorFunction: NodejsFunction;
  public appSecret: ISecret;

  constructor(
    scope: Construct,
    public readonly id: string,
    public readonly props: AppStackProps
  ) {
    super(scope, id, props);
    this.buildResources();
  }

  buildResources() {
    this.importSecret();
    this.buildDynamoDBTable();
    this.buildAnalyzerFunction();
    this.buildEvaluatorFunction();
    this.buildEventBus();
  }

  importSecret() {
    const secretId = `${this.id}-secret`;
    this.appSecret = Secret.fromSecretNameV2(
      this,
      secretId,
      `${this.props.serviceName}-${this.props.environmentName}`
    );
  }

  private buildDynamoDBTable() {
    const tableName = `${this.id}-table`;
    this.dbTable = new TableV2(this, tableName, {
      tableName,
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billing: Billing.onDemand(),
      contributorInsights: true,
      deletionProtection: false,
      // deletionProtection: true,
      dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: "ttl",
    });
    this.dbTable.addLocalSecondaryIndex({
      indexName: "lsi1",
      sortKey: { name: "lsi1", type: AttributeType.STRING },
    });
  }

  buildFunction(name: string, props?: NodejsFunctionProps) {
    const fcnProps = {
      architecture: Architecture.ARM_64,
      bundling: {
        sourceMap: true, // Enable source maps
        minify: false, // Disable minification for better debugging
        keepNames: true, // Preserve original function names
        metafile: true, // Generate metadata about the build
        sourcesContent: true, // Include source contents in source maps
      },
      runtime: Runtime.NODEJS_20_X,
      description: "BitsyBot Handler",
      environment: {
        DB_TABLE: this.dbTable.tableName,
        NODE_OPTIONS: "--enable-source-maps",
        LOG_LEVEL: "INFO",
        ENVIRONMENT_NAME: this.props.environmentName,
        NODE_ENV:
          this.props.environmentName === "prod" ? "production" : "development",
        POWERTOOLS_METRICS_NAMESPACE: `${this.props.serviceName}-${this.props.environmentName}`,
        POWERTOOLS_SERVICE_NAME: `${this.props.serviceName}-${this.props.environmentName}-${name}`,
        SECRET_ARN: this.appSecret.secretArn,
        SERVICE_NAME: this.props.serviceName,
      },
      memorySize: 256,
      functionName: `${this.props.serviceName}-${this.props.environmentName}-${name}`,
      timeout: Duration.minutes(15),
      tracing: Tracing.ACTIVE,
      ...props,
    };
    const fcn = new NodejsFunction(this, name, fcnProps);
    this.appSecret.grantRead(fcn);
    this.dbTable.grantReadWriteData(fcn);

    fcn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "cloudwatch:namespace": `${this.props.serviceName}-${this.props.environmentName}`,
          },
        },
      })
    );
    return fcn;
  }

  buildAnalyzerFunction() {
    this.analyzerFunction = this.buildFunction("analyzer", {
      description:
        "Analyze market data and issue BUY/SELL recommendations informed by various technical indicators.",
    });
  }

  buildEvaluatorFunction() {
    this.evaluatorFunction = this.buildFunction("evaluator", {
      description:
        "Evaluate the performance of trading recommendations and provide feedback to improve the trading strategy.",
    });
  }

  buildEventBus() {
    const eventBusId = `${this.id}-event-bus`;
    this.eventBus = new EventBus(this, eventBusId, {
      eventBusName: `${this.props.serviceName}-${this.props.environmentName}-event-bus`,
    });

    this.invokeHandlerRule = new Rule(this, `${this.id}-invoke-handler-rule`, {
      description: "Rule to invoke Handler lambda",
      eventPattern: {
        source: [this.props.serviceName],
        detailType: ["invokeHandler"],
      },
      eventBus: this.eventBus,
    });

    this.invokeHandlerRule.addTarget(new LambdaFunction(this.analyzerFunction));
    this.invokeHandlerRule.addTarget(
      new LambdaFunction(this.evaluatorFunction)
    );

    const scheduleRule = new Rule(this, `${this.id}-schedule-rule`, {
      schedule: Schedule.rate(Duration.minutes(15)),
      description: "Rule to invoke Handler lambda every 15 minutes",
      enabled: true, // Can be controlled by environment
      targets: [
        new LambdaFunction(this.analyzerFunction, {
          event: RuleTargetInput.fromObject({
            symbol: "XBTUSDT",
            interval: 15,
          }),
        }),
        new LambdaFunction(this.evaluatorFunction, {
          event: RuleTargetInput.fromObject({
            symbol: "XBTUSDT",
            interval: 15,
          }),
        }),
      ],
      eventPattern: {
        source: [this.props.serviceName],
        detailType: ["invokeHandler"],
      },
    });
    // Add Event permissions to Lambdas
    this.analyzerFunction.addPermission("AllowEventBridgeInvoke", {
      principal: new ServicePrincipal("events.amazonaws.com"),
      sourceArn: scheduleRule.ruleArn,
    });
    this.evaluatorFunction.addPermission("AllowEventBridgeInvoke", {
      principal: new ServicePrincipal("events.amazonaws.com"),
      sourceArn: scheduleRule.ruleArn,
    });
  }
}
