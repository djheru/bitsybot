import { AnalysisRecord } from "../types";

export function formatAnalysisRecord(record: AnalysisRecord): string {
  const timestamp = new Date(record.timestamp).toLocaleString();

  return `
*🔔 HIGH CONFIDENCE TRADING SIGNAL*
>*Symbol:* ${record.symbol}
>*Interval:* ${record.interval}
>*Time:* ${timestamp}
>*Price:* $${record.price.toLocaleString()}
>*Final Recommendation:* ${
    record.finalRecommendation
  } (${record.confidence.toFixed(2)})

*📊 INDICATOR ANALYSIS*
--------------------------------

*🎯 Bollinger Bands* _(${record.bollinger.confidence.toFixed(2)})_
\`Recommendation: ${record.bollinger.recommendation}\`
>${record.bollinger.rationale}

*📈 RSI* _(${record.rsi.confidence.toFixed(2)})_
\`Recommendation: ${record.rsi.recommendation}\`
>${record.rsi.rationale}

*📉 MACD* _(${record.macd.confidence.toFixed(2)})_
\`Recommendation: ${record.macd.recommendation}\`
>${record.macd.rationale}

*💹 VWAP* _(${record.vwap.confidence.toFixed(2)})_
\`Recommendation: ${record.vwap.recommendation}\`
>${record.vwap.rationale}

*🎯 FINAL ANALYSIS* _(${record.confidence.toFixed(2)})_
--------------------------------
>${record.finalAnalysis.rationale}`;
}
