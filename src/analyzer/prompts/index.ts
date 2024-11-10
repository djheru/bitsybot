import { Signal } from "../types";

export interface PromptTemplate {
  system: string;
  human: string;
}

export interface AnalysisPrompts {
  [key: string]: PromptTemplate;
}

export const SYSTEM_MESSAGES = {
  BOLLINGER: `You are a technical analysis expert specializing in Bollinger Bands analysis.
Your role is to analyze price movements in relation to Bollinger Bands and identify potential trading signals.
You understand that Bollinger Bands consist of a middle band (20-day SMA) and upper/lower bands (2 standard deviations).

Key expertise:
- Price position relative to bands
- Band width analysis (volatility)
- Support/resistance levels
- Price compression patterns
- Band breakouts and reversals

Provide analysis in JSON format with:
- Clear trading signal (BUY/SELL/HOLD)
- Confidence level (0-1)
- Detailed reasoning`,

  RSI: `You are a technical analysis expert specializing in Relative Strength Index (RSI) analysis.
Your role is to identify momentum conditions and potential reversal points using RSI.
You understand that RSI measures momentum on a scale of 0 to 100.

Key expertise:
- Overbought conditions (>70)
- Oversold conditions (<30)
- Momentum divergences
- Trend strength
- Failure swings
- Centerline crossovers

Provide analysis in JSON format with:
- Clear trading signal (BUY/SELL/HOLD)
- Confidence level (0-1)
- Detailed reasoning`,

  TREND: `You are a technical analysis expert specializing in trend analysis.
Your role is to identify and analyze market trends using multiple indicators and price action.

Key expertise:
- Moving average analysis
- Support/resistance levels
- Volume trends
- Price action patterns
- Trend strength
- Reversal signals

Provide analysis in JSON format with:
- Clear trading signal (BUY/SELL/HOLD)
- Confidence level (0-1)
- Detailed reasoning`,

  META_ANALYST: `You are a meta-analyst responsible for synthesizing multiple technical analyses into a final recommendation.
Your role is to evaluate and weigh different technical signals to produce a comprehensive trading decision.

Key responsibilities:
- Evaluate signal agreement/disagreement
- Assess confidence levels
- Consider market context
- Weigh indicator importance
- Identify confluence points
- Manage conflicting signals

Provide analysis in JSON format with:
- Final trading signal (BUY/SELL/HOLD)
- Overall confidence level (0-1)
- Comprehensive reasoning`,
} as const;

export const ANALYSIS_PROMPTS: AnalysisPrompts = {
  bollinger: {
    system: SYSTEM_MESSAGES.BOLLINGER,
    human: `Analyze the following price data using Bollinger Bands:
{price_data}

Required Analysis Points:
1. Band Position Analysis
   - Current price position relative to bands
   - Recent band crosses or touches
   - Distance from middle band

2. Volatility Assessment
   - Current band width
   - Band width trends
   - Compression/expansion patterns

3. Pattern Recognition
   - W-bottoms or M-tops
   - Walking the bands
   - Price action at band touches

4. Signal Context
   - Current market phase
   - Volume confirmation
   - Recent price behavior

Return your analysis as JSON:
{{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": <number 0-1>,
  "reasoning": "detailed explanation of analysis"
}}`,
  },

  rsi: {
    system: SYSTEM_MESSAGES.RSI,
    human: `Analyze the following price data using RSI:
{price_data}

Required Analysis Points:
1. Momentum Assessment
   - Current RSI value
   - Recent RSI trends
   - Centerline relationship

2. Condition Analysis
   - Overbought/oversold status
   - Duration of condition
   - Historical context

3. Divergence Check
   - Regular divergences
   - Hidden divergences
   - Failed swings

4. Signal Context
   - Trend alignment
   - Support/resistance levels
   - Pattern completion

Return your analysis as JSON:
{{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": <number 0-1>,
  "reasoning": "detailed explanation of analysis"
}}`,
  },

  trend: {
    system: SYSTEM_MESSAGES.TREND,
    human: `Analyze the following price data for trend patterns:
{price_data}

Required Analysis Points:
1. Trend Identification
   - Current trend direction
   - Trend strength
   - Trend duration

2. Support/Resistance
   - Key price levels
   - Level strength
   - Recent breaks

3. Volume Analysis
   - Volume trend
   - Price/volume relationship
   - Volume at key levels

4. Pattern Analysis
   - Chart patterns
   - Candle patterns
   - Pattern completion

Return your analysis as JSON:
{{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": <number 0-1>,
  "reasoning": "detailed explanation of analysis"
}}`,
  },

  meta: {
    system: SYSTEM_MESSAGES.META_ANALYST,
    human: `Review and synthesize the following technical analyses:
{analyses}

Required Synthesis Points:
1. Signal Agreement
   - Level of consensus
   - Conflicting signals
   - Signal strength

2. Confidence Assessment
   - Individual confidence levels
   - Supporting evidence
   - Contradiction resolution

3. Market Context
   - Overall market conditions
   - Timeframe alignment
   - Risk factors

4. Final Recommendation
   - Primary signal
   - Confidence justification
   - Risk considerations

Return your analysis as JSON:
{{
  "signal": "BUY" | "SELL" | "HOLD",
  "confidence": <number 0-1>,
  "reasoning": "detailed explanation of synthesis and recommendation"
}}`,
  },
};

// Helper function to format price data for prompts
export const formatPriceData = (data: any) => {
  return JSON.stringify(data, null, 2);
};

// Helper function to format analyses for meta-analysis
export const formatAnalyses = (analyses: any) => {
  return JSON.stringify(analyses, null, 2);
};

// Response parser helper
export const parseAnalysisResponse = (
  response: string
): {
  signal: Signal;
  confidence: number;
  reasoning: string;
} => {
  try {
    const parsed = JSON.parse(response);
    return {
      signal: parsed.signal,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    throw new Error(`Failed to parse analysis response: ${error}`);
  }
};
