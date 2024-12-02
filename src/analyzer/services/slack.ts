import { Logger } from "@aws-lambda-powertools/logger";
import { WebClient } from "@slack/web-api";
import { AnalysisRecord } from "../types";

const msg = {
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚀 BTCUSDT Trade Recommendation: BUY",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*Symbol:* BTCUSDT",
        },
        {
          type: "mrkdwn",
          text: "*Interval:* 15 minutes",
        },
        {
          type: "mrkdwn",
          text: "*Current Price:* $97,520",
        },
        {
          type: "mrkdwn",
          text: "*Confidence:* 7/10",
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Final Rationale:* The final recommendation is a BUY with an overall confidence level of 7. This decision is based on strong bullish signals from trend and volume analysis, despite neutral indications from other analyses.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Agent Recommendations",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*Candlestick Analysis:* HOLD (3/10)\n_No significant candlestick patterns detected._",
        },
        {
          type: "mrkdwn",
          text: "*Momentum Analysis:* HOLD (6/10)\n_Mixed signals from RSI and Williams %R._",
        },
        {
          type: "mrkdwn",
          text: "*Trend Analysis:* BUY (8/10)\n_Rising EMA and positive MACD indicate strong bullish trend._",
        },
        {
          type: "mrkdwn",
          text: "*Volatility Analysis:* HOLD (6/10)\n_Moderate ATR and mixed Bollinger Band signals._",
        },
        {
          type: "mrkdwn",
          text: "*Volume Analysis:* BUY (8/10)\n_Increasing OBV and strong Force Index suggest buying pressure._",
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "💡 Entry Position Details",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: "*Entry Price:* $96,400.5",
        },
        {
          type: "mrkdwn",
          text: "*Exit Price:* $96,880.5",
        },
        {
          type: "mrkdwn",
          text: "*Stop Loss:* $96,100.5",
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Entry Rationale:* The entry price aligns with the current market price, with the stop loss adjusted for volatility using ATR and Bollinger Bands. The exit price is based on a Risk-to-Reward ratio of 2:1.",
      },
    },
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "📅 Generated on: 2024-12-02T02:41:10.743Z | *UUID:* 198752c3-bf9c-4626-8254-f9129d40e3c9",
        },
      ],
    },
  ],
};

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
    formattedMessage: string,
    formattedBlocksMessage: Record<"blocks", any[]>
  ): Promise<void> {
    try {
      await this.client.chat.postMessage({
        token: this.slackToken,
        channel: this.channelId,
        text: formattedMessage,
        blocks: formattedBlocksMessage.blocks,
        mrkdwn: true,
      });
    } catch (error) {
      this.logger.error("Failed to send Slack message", { error });
      throw error;
    }
  }
}
