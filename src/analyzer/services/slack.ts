import { Logger } from "@aws-lambda-powertools/logger";
import { WebClient } from "@slack/web-api";
import { DateTime } from "luxon";
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

    const formatAnalysis = (
      analysis: IndicatorAnalysis
    ) => `_(${analysis.confidence}/10)_
  \`Recommendation: ${analysis.recommendation}\`
>${analysis.rationale}`;

    let message = `
----------------------------
*${
      record.confidence && record.confidence < 8
        ? record.confidence < 4
          ? ":bellhop_bell:"
          : ":bell:"
        : ":rotating_light:"
    } ${
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
>*Time:* ${DateTime.fromISO(record.timestamp)
      .setZone("America/Phoenix")
      .toFormat("MM/dd/yyyy hh:mm a")} MST
>*Price:* $${record.currentPrice.toLocaleString()}
>*Final Recommendation:* ${record.recommendation} (${
      record?.confidence || 0
    }/10)
----------------------------

  `;

    if (record.entryPosition) {
      message += `
*💰 ENTRY POSITION DETAILS*
>*Entry Price:* $${record.entryPosition.entryPrice.toLocaleString()}
>*Exit Price:* $${record.entryPosition.exitPrice.toLocaleString()}
>*Stop Loss:* $${record.entryPosition.stopLoss.toLocaleString()}
>${record.entryPosition.rationale}
----------------------------

`;
    }

    const agentAnalysis = `

*🤖 MULTI-AGENT ANALYSIS 🤖*

*🕯️ Candlestick Agent* ${formatAnalysis(record.candlestickAnalysis)}

*🚂 Momentum Agent* ${formatAnalysis(record.momentumAnalysis)}

*📈 Trend Agent* ${formatAnalysis(record.trendAnalysis)}

*🌪 Volatility Agent* ${formatAnalysis(record.volatilityAnalysis)}

*🔍 Volume Agent* ${formatAnalysis(record.volumeAnalysis)}  

*🌥️ Ichimoku Cloud Agent* ${formatAnalysis(record.ichimokuAnalysis)}
----------------------------

`;

    const finalAnalysis = `

*🎯 FINAL ANALYSIS: ${record?.recommendation}*  _(${
      record?.confidence || 0
    }/10)_
>${record.rationale}
  `;

    return [message, agentAnalysis, finalAnalysis];
  }
}
