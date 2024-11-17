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

*📊 INDICATOR ANALYSIS*
--------------------------------

*🎯 Bollinger Bands* _(${record.bbAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.bbAnalysis.recommendation}\`
>${record.bbAnalysis.rationale}

*📈 RSI* _(${record.rsiAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.rsiAnalysis.recommendation}\`
>${record.rsiAnalysis.rationale}

*📉 MACD* _(${record.macdAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.macdAnalysis.recommendation}\`
>${record.macdAnalysis.rationale}

*💹 STOCH* _(${record.stochAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.stochAnalysis.recommendation}\`
>${record.stochAnalysis.rationale}

*💥 ATR* _(${record.atrAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.atrAnalysis.recommendation}\`
>${record.atrAnalysis.rationale}

*📊 VWAP* _(${record.vwapAnalysis.confidence.toFixed(2)})_
\`Recommendation: ${record.vwapAnalysis.recommendation}\`
>${record.vwapAnalysis.rationale}

*🎯 FINAL ANALYSIS* _(${record.confidence.toFixed(2)})_
--------------------------------
>${record.finalAnalysis.rationale}`;
}
