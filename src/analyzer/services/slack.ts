import { Logger } from "@aws-lambda-powertools/logger";
import { WebClient } from "@slack/web-api";
import { AnalysisRecord } from "../types";
import { formatAnalysisRecord } from "./format-analysis";

export class SlackService {
  private client: WebClient;

  constructor(
    private readonly slackToken: string,
    private readonly channelId: string,
    private readonly logger: Logger
  ) {
    this.client = new WebClient(slackToken);
  }

  async sendHighConfidenceAlert(record: AnalysisRecord): Promise<void> {
    try {
      const formattedMessage = formatAnalysisRecord(record);

      await this.client.chat.postMessage({
        token: this.slackToken,
        channel: this.channelId,
        text: formattedMessage,
        mrkdwn: true,
      });

      this.logger.info("Sent high confidence alert to Slack", {
        symbol: record.symbol,
        recommendation: record.finalRecommendation,
        confidence: record.finalAnalysis.confidence,
      });
    } catch (error) {
      this.logger.error("Failed to send Slack message", { error });
      throw error;
    }
  }
}
