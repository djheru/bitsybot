import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { IndicatorAnalysis, IndicatorResult, TimeSeriesPoint } from "../types";

// Base formatter for time series data
function formatTimeSeries(series: TimeSeriesPoint[], label: string): string {
  return series
    .slice(-10) // Get last 10 points for readability
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

// Bollinger Bands Analysis Agent
export class BollingerBandsAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();

    const template = `You are an expert cryptocurrency technical analyst specializing in Bollinger Bands analysis.
Analyze the provided Bollinger Bands data and provide a trading recommendation.

Current Values:
Middle Band: {current_middle}
Upper Band: {current_upper}
Lower Band: {current_lower}
Current Price: {current_price}
Band Width: {current_bandwidth}
%B (Position within bands): {current_percentB}

Recent Price History (Last 10 points):
{price_history}

Recent Band History:
Upper Band:
{upper_history}
Middle Band:
{middle_history}
Lower Band:
{lower_history}

Based on this data, provide:
1. A trading recommendation (BUY, SELL, or HOLD)
2. A confidence score (0.0 to 1.0)
3. A brief rationale explaining your recommendation

Consider:
- Price position relative to the bands
- Band width trends (expansion/contraction)
- Recent price action patterns
- Band crossing signals

Respond in the following JSON format:
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "string explaining the analysis"
}}`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing Bollinger Bands data", { data });
    const input = {
      current_middle: data.current.middle.toFixed(2),
      current_upper: data.current.upper.toFixed(2),
      current_lower: data.current.lower.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_bandwidth: data.current.bandwidth.toFixed(4),
      current_percentB: data.current.percentB.toFixed(2),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      upper_history: formatTimeSeries(data.history.upper, "upper_history"),
      middle_history: formatTimeSeries(data.history.middle, "middle_history"),
      lower_history: formatTimeSeries(data.history.lower, "lower_history"),
    };

    return await this.chain.invoke(input);
  }
}

// RSI Analysis Agent
export class RSIAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();

    const template = `You are an expert cryptocurrency technical analyst specializing in RSI analysis.
Analyze the provided RSI data and provide a trading recommendation.

Current Values:
RSI: {current_rsi}
Current Price: {current_price}

Recent History (Last 10 points):
RSI Values:
{rsi_history}
Price Values:
{price_history}

Based on this data, provide:
1. A trading recommendation (BUY, SELL, or HOLD)
2. A confidence score (0.0 to 1.0)
3. A brief rationale explaining your recommendation

Consider:
- Traditional overbought (>70) and oversold (<30) levels
- RSI divergence with price
- Trend in RSI values
- Failed swings
- Regular vs hidden divergence patterns

Respond with a JSON object. Here's an example of the required format:

{{
  "recommendation": "HOLD",
  "confidence": 0.75,
  "rationale": "RSI is at 45, showing neutral momentum. Price is trending sideways with no clear divergence patterns."
}}

Your response must be valid JSON with exactly these three fields. The recommendation must be one of: BUY, SELL, or HOLD. The confidence must be a number between 0 and 1.`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing RSI data", { data });
    const input = {
      current_rsi: data.current.rsi.toFixed(2),
      current_price: data.current.price.toFixed(2),
      rsi_history: formatTimeSeries(data.history.rsi, "rsi_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
    };

    return await this.chain.invoke(input);
  }
}

export class VWAPAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();

    const template = `You are an expert cryptocurrency technical analyst specializing in VWAP (Volume-Weighted Average Price) analysis.
Analyze the provided VWAP data and provide a trading recommendation.

Current Values:
VWAP: {current_vwap}
Current Price: {current_price}
Price to VWAP Difference: {price_to_vwap}%
Volume Strength (relative to 20-period average): {relative_volume}x

Recent History (Last 10 points):
VWAP Values:
{vwap_history}
Price Values:
{price_history}
Volume Profile:
{volume_history}

Based on this data, provide:
1. A trading recommendation (BUY, SELL, or HOLD)
2. A confidence score (0.0 to 1.0)
3. A brief rationale explaining your recommendation

Consider:
- Price position relative to VWAP (above/below)
- Magnitude of price deviation from VWAP
- Volume confirmation of price movements
- Recent volume profile and its implications
- Whether high-volume price movements are respecting VWAP as support/resistance

Key VWAP principles to consider:
- Institutional traders often use VWAP for large orders
- Strong trends often show consistent price position relative to VWAP
- High-volume reversals at VWAP levels are significant
- Price returning to VWAP after deviation often indicates potential reversal

Respond in the following JSON format:
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "string explaining the analysis"
}}`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing VWAP data", { data });
    const input = {
      current_vwap: data.current.vwap.toFixed(2),
      current_price: data.current.price.toFixed(2),
      price_to_vwap: data.current.priceToVWAP.toFixed(2),
      relative_volume: data.current.relativeVolume.toFixed(2),
      vwap_history: formatTimeSeries(data.history.vwap, "vwap_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      volume_history: formatTimeSeries(
        data.history.relativeVolume,
        "volume_history"
      ),
    };

    return await this.chain.invoke(input);
  }
}

export class MACDAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();

    const template = `You are an expert cryptocurrency technical analyst specializing in MACD analysis.
Analyze the provided MACD data and provide a trading recommendation.

Current Values:
MACD Line: {current_macd}
Signal Line: {current_signal}
Histogram: {current_histogram}
Current Price: {current_price}

Recent History (Last 10 points):
MACD Line Values:
{macd_history}
Signal Line Values:
{signal_history}
Histogram Values:
{histogram_history}
Price Values:
{price_history}

Based on this data, provide:
1. A trading recommendation (BUY, SELL, or HOLD)
2. A confidence score (0.0 to 1.0)
3. A brief rationale explaining your recommendation

Consider:
- MACD line crossovers with the signal line
- Histogram changes and momentum
- Divergence between MACD and price
- Centerline crossovers (MACD crossing zero)
- Trend strength indicated by histogram size
- Hidden and regular bullish/bearish divergence patterns

Respond with a JSON object. Here's an example of the required format:

{{
  "recommendation": "HOLD",
  "confidence": 0.75,
  "rationale": "MACD remains above signal line but histogram is contracting, suggesting weakening bullish momentum. No significant divergence patterns present."
}}

Your response must be valid JSON with exactly these three fields. The recommendation must be one of: BUY, SELL, or HOLD. The confidence must be a number between 0 and 1.`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing MACD data", { data });
    const input = {
      current_macd: data.current.macdLine.toFixed(2),
      current_signal: data.current.signalLine.toFixed(2),
      current_histogram: data.current.histogram.toFixed(2),
      current_price: data.current.price.toFixed(2),
      macd_history: formatTimeSeries(data.history.macdLine, "macd_history"),
      signal_history: formatTimeSeries(
        data.history.signalLine,
        "signal_history"
      ),
      histogram_history: formatTimeSeries(
        data.history.histogram,
        "histogram_history"
      ),
      price_history: formatTimeSeries(data.history.price, "price_history"),
    };

    return await this.chain.invoke(input);
  }
}

// Final Analysis Agent
export class FinalAnalysisAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();

    const template = `You are a senior cryptocurrency technical analyst responsible for making final trading decisions.
Review the analysis from multiple technical indicators and provide a consolidated recommendation.

Bollinger Bands Analysis:
Recommendation: {bb_recommendation}
Confidence: {bb_confidence}
Rationale: {bb_rationale}

RSI Analysis:
Recommendation: {rsi_recommendation}
Confidence: {rsi_confidence}
Rationale: {rsi_rationale}

MACD Analysis:
Recommendation: {macd_recommendation}
Confidence: {macd_confidence}
Rationale: {macd_rationale}

VWAP Analysis:
Recommendation: {vwap_recommendation}
Confidence: {vwap_confidence}
Rationale: {vwap_rationale}

Current Market Price: {current_price}

Based on these analyses, provide:
1. A final trading recommendation (BUY, SELL, or HOLD)
2. A consolidated confidence score (0.0 to 1.0)
3. A brief rationale explaining your final decision

Consider:
- Agreement/disagreement between indicators
- The relative importance of each indicator:
  * MACD and RSI for momentum and trend confirmation
  * Bollinger Bands for volatility and price channels
  * VWAP for institutional interest and volume confirmation
- Relative confidence levels of each analysis
- The combination of signals that typically indicates stronger setups:
  * RSI oversold/overbought with MACD crossover
  * Price at Bollinger Band extremes with confirming MACD/RSI
  * VWAP crossovers confirmed by other indicators
- Risk management principles

Respond with a JSON object. Here's an example of the required format:

{{
  "recommendation": "BUY",
  "confidence": 0.85,
  "rationale": "Strong confluence of signals: RSI showing oversold conditions, MACD showing bullish crossover, price at lower Bollinger Band with increasing volume. VWAP suggests institutional support."
}}

Your response must be valid JSON with exactly these three fields. The recommendation must be one of: BUY, SELL, or HOLD. The confidence must be a number between 0 and 1.`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(
    bbAnalysis: IndicatorAnalysis,
    rsiAnalysis: IndicatorAnalysis,
    macdAnalysis: IndicatorAnalysis,
    vwapAnalysis: IndicatorAnalysis,
    currentPrice: number
  ): Promise<IndicatorAnalysis> {
    this.logger.info("Performing final analysis", {
      bbAnalysis,
      rsiAnalysis,
      macdAnalysis,
      vwapAnalysis,
      currentPrice,
    });

    const input = {
      bb_recommendation: bbAnalysis.recommendation,
      bb_confidence: bbAnalysis.confidence,
      bb_rationale: bbAnalysis.rationale,
      rsi_recommendation: rsiAnalysis.recommendation,
      rsi_confidence: rsiAnalysis.confidence,
      rsi_rationale: rsiAnalysis.rationale,
      macd_recommendation: macdAnalysis.recommendation,
      macd_confidence: macdAnalysis.confidence,
      macd_rationale: macdAnalysis.rationale,
      vwap_recommendation: vwapAnalysis.recommendation,
      vwap_confidence: vwapAnalysis.confidence,
      vwap_rationale: vwapAnalysis.rationale,
      current_price: currentPrice.toFixed(2),
    };

    return await this.chain.invoke(input);
  }
}
