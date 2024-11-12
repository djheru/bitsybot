import { TimeSeriesPoint } from "../types";

export { FinalAnalysisAgent } from "./analysis-agent";
export { BollingerBandsAgent } from "./bollinger-bands-agent";
export { MACDAgent } from "./macd-agent";
export { RSIAgent } from "./rsi-agent";
export { VWAPAgent } from "./vwap-agent";

// Base formatter for time series data
export function formatTimeSeries(
  series: TimeSeriesPoint[],
  label: string,
  limit = 10
): string {
  return series
    .slice(-1 * limit) // Get last 10 points for readability
    .map((point) => {
      if (!point.value) {
        throw new Error(`Invalid time series point for ${label}`);
      }
      return `${new Date(point.timestamp).toISOString()}: ${point.value.toFixed(
        2
      )}`;
    })
    .join("\n");
}
