import { AnalysisRecord } from "../types";

export function formatAnalysisRecord(record: AnalysisRecord): string {
  const timestamp = new Date(record.timestamp).toLocaleString();

  return `
*🔔 HIGH CONFIDENCE TRADING SIGNAL*
>*Symbol:* ${record.symbol}
>*Interval:* ${record.interval}
>*Time:* ${timestamp}
>*Price:* $${record.currentPrice.toLocaleString()}
>*Final Recommendation:* ${
    record.finalRecommendation
  } (${record.confidence.toFixed(2)})
--------------------------------

*📊 INDICATOR ANALYSIS*
--------------------------------
*🎰 ATR* _(${record.atrAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.atrAnalysis.recommendation}\`
>${record.atrAnalysis.rationale}

*💹 MACD* _(${record.macdAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.macdAnalysis.recommendation}\`
>${record.macdAnalysis.rationale}

*📈 RSI* _(${record.rsiAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.rsiAnalysis.recommendation}\`
>${record.rsiAnalysis.rationale}

*🎯 FINAL ANALYSIS* _(${record.confidence.toFixed(2)})_
--------------------------------
>${record.finalAnalysis.rationale}`;
}
