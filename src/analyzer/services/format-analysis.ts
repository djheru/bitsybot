import { AnalysisRecord } from "../types";

export function formatAnalysisRecord(record: AnalysisRecord): string {
  const timestamp = new Date(record.timestamp).toLocaleString();

  let formattedMessage = `
*🔔 HIGH CONFIDENCE TRADING SIGNAL*
>*Symbol:* ${record.symbol}
>*Interval:* ${record.interval} minutes
>*Time:* ${timestamp}
>*Price:* $${record.currentPrice.toLocaleString()}
>*Final Recommendation:* ${record.recommendation} (${(
    record?.confidence || 0
  ).toFixed(1)}/10)
--------------------------------

*📊 AGENT ANALYSIS*
--------------------------------
*📉 Candlestick Analysis* _(${record.candlestickAnalysis.confidence.toFixed(
    1
  )}/10)_
\`Recommendation: ${record.candlestickAnalysis.recommendation}\`
>${record.candlestickAnalysis.rationale}

*⚡ Momentum Analysis* _(${record.momentumAnalysis.confidence.toFixed(1)}/10)_
\`Recommendation: ${record.momentumAnalysis.recommendation}\`
>${record.momentumAnalysis.rationale}

*📈 Trend Analysis* _(${record.trendAnalysis.confidence.toFixed(1)}/10)_
\`Recommendation: ${record.trendAnalysis.recommendation}\`
>${record.trendAnalysis.rationale}

*🌪 Volatility Analysis* _(${record.volatilityAnalysis.confidence.toFixed(
    1
  )}/10)_
\`Recommendation: ${record.volatilityAnalysis.recommendation}\`
>${record.volatilityAnalysis.rationale}

*🔍 Volume Analysis* _(${record.volumeAnalysis.confidence.toFixed(1)}/10)_
\`Recommendation: ${record.volumeAnalysis.recommendation}\`
>${record.volumeAnalysis.rationale}

--------------------------------
*🎯 FINAL ANALYSIS* _(${(record?.confidence || 0).toFixed(1)}/10)_
>${record.rationale}
`;

  if (record.entryPosition) {
    formattedMessage += `
--------------------------------
*💡 ENTRY POSITION DETAILS*
>*Entry Price:* $${record.entryPosition.entryPrice.toLocaleString()}
>*Exit Price:* $${record.entryPosition.exitPrice.toLocaleString()}
>*Stop Loss:* $${record.entryPosition.stopLoss.toLocaleString()}
>${record.entryPosition.rationale}`;
  }
  return formattedMessage;
}

export const formatAnalysisRecordBlocks = (record: AnalysisRecord) => ({
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🚀 ${record.symbol} Trade Recommendation: ${record.recommendation}`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Symbol:* ${record.symbol}`,
        },
        {
          type: "mrkdwn",
          text: `*Interval:* ${record.interval} minutes`,
        },
        {
          type: "mrkdwn",
          text: `*Current Price:* $${record.currentPrice.toLocaleString()}`,
        },
        {
          type: "mrkdwn",
          text: `*Confidence:* ${(record?.confidence || 0).toFixed(1)}/10`,
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
        text: `*Final Rationale:* ${record.rationale}`,
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
          text: `*Candlestick Analysis:* ${record.candlestickAnalysis.recommendation} (${record.candlestickAnalysis.confidence}/10)\n_${record.candlestickAnalysis.rationale}_`,
        },
        {
          type: "mrkdwn",
          text: `*Momentum Analysis:* ${record.momentumAnalysis.recommendation} (${record.momentumAnalysis.confidence}/10)\n_${record.momentumAnalysis.rationale}_`,
        },
        {
          type: "mrkdwn",
          text: `*Trend Analysis:* ${record.trendAnalysis.recommendation} (${record.trendAnalysis.confidence}/10)\n_${record.trendAnalysis.rationale}_`,
        },
        {
          type: "mrkdwn",
          text: `*Volatility Analysis:* ${record.volatilityAnalysis.recommendation} (${record.volatilityAnalysis.confidence}/10)\n_${record.volatilityAnalysis.rationale}_`,
        },
        {
          type: "mrkdwn",
          text: `*Volume Analysis:* ${record.volumeAnalysis.recommendation} (${record.volumeAnalysis.confidence}/10)\n_${record.volumeAnalysis.rationale}_`,
        },
      ],
    },
    ...(record.entryPosition
      ? [
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
                text: `*Entry Price:* $${record.entryPosition.entryPrice.toLocaleString()}`,
              },
              {
                type: "mrkdwn",
                text: `*Exit Price:* $${record.entryPosition.exitPrice.toLocaleString()}`,
              },
              {
                type: "mrkdwn",
                text: `*Stop Loss:* $${record.entryPosition.stopLoss.toLocaleString()}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Entry Rationale:* _${record.entryPosition.rationale}_`,
            },
          },
        ]
      : []),
    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📅 Generated on: ${record.timestamp} | *UUID:* ${record.uuid}`,
        },
      ],
    },
  ],
});
