import { Logger } from "@aws-lambda-powertools/logger";
import { WebClient } from "@slack/web-api";
import { AnalysisRecord, IndicatorAnalysis } from "../types";

type FormattedMessage = [
  message: string,
  agentAnalysis: string,
  finalAnalysis: string
];
export class SlackService {
  private client: WebClient;

  constructor(
    private readonly slackToken: string,
    private readonly channelId: string,
    private readonly logger: Logger
  ) {
    this.client = new WebClient(slackToken);
  }

  async sendHighConfidenceAlert(
    formattedMessage: FormattedMessage
  ): Promise<void> {
    try {
      for (const text of formattedMessage) {
        await this.client.chat.postMessage({
          token: this.slackToken,
          channel: this.channelId,
          text,
          mrkdwn: true,
        });
      }
    } catch (error) {
      this.logger.error("Failed to send Slack message", { error });
      throw error;
    }
  }

  formatMessages(record: AnalysisRecord): FormattedMessage {
    const timestamp = new Date(record.timestamp).toLocaleString();

    let message = `
  --------------------------------
  *🔔 ${
    !record.confidence
      ? "UNKNOWN"
      : record.confidence > 7
      ? "HIGH"
      : record.confidence > 4
      ? "MEDIUM"
      : "LOW"
  } CONFIDENCE TRADING SIGNAL*
  >*Symbol:* ${record.symbol}
  >*Interval:* ${record.interval} minutes
  >*Time:* ${timestamp}
  >*Price:* $${record.currentPrice.toLocaleString()}
  >*Final Recommendation:* ${record.recommendation} (${
      record?.confidence || 0
    }/10)
  --------------------------------
  `;

    if (record.entryPosition) {
      message += `
  *💰 ENTRY POSITION DETAILS*
  >*Entry Price:* $${record.entryPosition.entryPrice.toLocaleString()}
  >*Exit Price:* $${record.entryPosition.exitPrice.toLocaleString()}
  >*Stop Loss:* $${record.entryPosition.stopLoss.toLocaleString()}
  >${record.entryPosition.rationale}
  --------------------------------`;
    }

    const formatAnalysis = (
      analysis: IndicatorAnalysis
    ) => `_(${analysis.confidence}/10)_
  \`Recommendation: ${analysis.recommendation}\`
  >${analysis.rationale}`;

    const agentAnalysis = `
  *🤖 MULTI-AGENT ANALYSIS*
  --------------------------------
  *🕯️ Candlestick Agent Analysis* 
  
  *🚂 Momentum Agent Analysis* ${formatAnalysis(record.momentumAnalysis)}
  
  *📈 Trend Agent Analysis* ${formatAnalysis(record.trendAnalysis)}
  
  *🌪 Volatility Agent Analysis* ${formatAnalysis(record.volatilityAnalysis)}
  
  *🔍 Volume Agent Analysis* ${formatAnalysis(record.volumeAnalysis)}  
  --------------------------------`;

    const finalAnalysis = `
  *🎯 FINAL ANALYSIS* _(${record?.confidence || 0}/10)_
  ${record.rationale}
  `;

    return [message, agentAnalysis, finalAnalysis];
  }
}
