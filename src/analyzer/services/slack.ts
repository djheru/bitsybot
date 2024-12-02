import { Logger } from "@aws-lambda-powertools/logger";
import { WebClient } from "@slack/web-api";
import { AnalysisRecord } from "../types";

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
    record: AnalysisRecord,
    formattedMessage: string
  ): Promise<void> {
    try {
      await this.client.chat.postMessage({
        token: this.slackToken,
        channel: this.channelId,
        text: formattedMessage,
        mrkdwn: true,
      });
    } catch (error) {
      this.logger.error("Failed to send Slack message", { error });
      throw error;
    }
  }
}
