import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { IndicatorAnalysis, IndicatorResult, TimeSeriesPoint } from "../types";

// Base formatter for time series data
function formatTimeSeries(series: TimeSeriesPoint[]): string {
  return series
    .slice(-10) // Get last 10 points for readability
    .map(
      (point) =>
        `${new Date(point.timestamp).toISOString()}: ${point.value.toFixed(2)}`
    )
    .join("\n");
}

// Bollinger Bands Analysis Agent
export class BollingerBandsAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(model: ChatOpenAI) {
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
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "string explaining the analysis"
}`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    const input = {
      current_middle: data.current.middle.toFixed(2),
      current_upper: data.current.upper.toFixed(2),
      current_lower: data.current.lower.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_bandwidth: data.current.bandWidth.toFixed(4),
      current_percentB: data.current.percentB.toFixed(2),
      price_history: formatTimeSeries(data.history.price),
      upper_history: formatTimeSeries(data.history.upper),
      middle_history: formatTimeSeries(data.history.middle),
      lower_history: formatTimeSeries(data.history.lower),
    };

    return await this.chain.invoke(input);
  }
}

// RSI Analysis Agent
export class RSIAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(model: ChatOpenAI) {
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

Respond in the following JSON format:
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "string explaining the analysis"
}`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    const input = {
      current_rsi: data.current.rsi.toFixed(2),
      current_price: data.current.price.toFixed(2),
      rsi_history: formatTimeSeries(data.history.rsi),
      price_history: formatTimeSeries(data.history.price),
    };

    return await this.chain.invoke(input);
  }
}

// Final Analysis Agent
export class FinalAnalysisAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(model: ChatOpenAI) {
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
- Relative confidence levels of each analysis
- Current market context
- Risk management principles

Respond in the following JSON format:
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "string explaining the final decision"
}`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(
    bbAnalysis: IndicatorAnalysis,
    rsiAnalysis: IndicatorAnalysis,
    vwapAnalysis: IndicatorAnalysis,
    currentPrice: number
  ): Promise<IndicatorAnalysis> {
    const input = {
      bb_recommendation: bbAnalysis.recommendation,
      bb_confidence: bbAnalysis.confidence,
      bb_rationale: bbAnalysis.rationale,
      rsi_recommendation: rsiAnalysis.recommendation,
      rsi_confidence: rsiAnalysis.confidence,
      rsi_rationale: rsiAnalysis.rationale,
      vwap_recommendation: vwapAnalysis.recommendation,
      vwap_confidence: vwapAnalysis.confidence,
      vwap_rationale: vwapAnalysis.rationale,
      current_price: currentPrice.toFixed(2),
    };

    return await this.chain.invoke(input);
  }
}

export class VWAPAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(model: ChatOpenAI) {
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();

    const template = `You are an expert cryptocurrency technical analyst specializing in VWAP (Volume-Weighted Average Price) analysis.
Analyze the provided VWAP data and provide a trading recommendation.

Current Values:
VWAP: {current_vwap}
Current Price: {current_price}
Price to VWAP Difference: {price_to_vwap}%
Volume Strength (relative to 20-period average): {volume_strength}x

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
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "string explaining the analysis"
}`;

    const prompt = PromptTemplate.fromTemplate(template);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    const input = {
      current_vwap: data.current.vwap.toFixed(2),
      current_price: data.current.price.toFixed(2),
      price_to_vwap: data.current.priceToVWAP.toFixed(2),
      volume_strength: data.current.volumeStrength.toFixed(2),
      vwap_history: formatTimeSeries(data.history.vwap),
      price_history: formatTimeSeries(data.history.price),
      volume_history: formatTimeSeries(data.history.volumeProfile),
    };

    return await this.chain.invoke(input);
  }
}
