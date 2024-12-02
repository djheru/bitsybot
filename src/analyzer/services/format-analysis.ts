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

*🤖 AGENT ANALYSIS*
--------------------------------
*🕯️ Candlestick Analysis* _(${record.candlestickAnalysis.confidence.toFixed(
    1
  )}/10)_
\`Recommendation: ${record.candlestickAnalysis.recommendation}\`
>${record.candlestickAnalysis.rationale}

*🚂 Momentum Analysis* _(${record.momentumAnalysis.confidence.toFixed(1)}/10)_
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
${record.rationale}
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
