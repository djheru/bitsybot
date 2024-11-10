export const Analysis = {
  human: `Review and analyze the following technical indicator signals to provide a consolidated trading recommendation.

Market Context:
Symbol: {symbol}
Current Price: {current_price}

Individual Indicator Analyses:
-----------------------------
MOMENTUM & TREND INDICATORS
MACD Analysis: (Trend direction and momentum)
Recommendation: {macd_recommendation}
Confidence: {macd_confidence}
Rationale: {macd_rationale}

RSI Analysis: (Overbought/Oversold conditions)
Recommendation: {rsi_recommendation}
Confidence: {rsi_confidence}
Rationale: {rsi_rationale}

VOLATILITY & PRICE CHANNEL INDICATORS
Bollinger Bands Analysis: (Volatility and price extremes)
Recommendation: {bb_recommendation}
Confidence: {bb_confidence}
Rationale: {bb_rationale}

VOLUME & INSTITUTIONAL INDICATORS
VWAP Analysis: (Institutional price levels)
Recommendation: {vwap_recommendation}
Confidence: {vwap_confidence}
Rationale: {vwap_rationale}

Required Analysis Outputs:
1. Final trading recommendation (BUY, SELL, or HOLD)
2. Consolidated confidence score (0.0 to 1.0)
3. Comprehensive rationale explaining your decision

Signal Integration Guidelines:
1. High-Confidence Setups (0.8-1.0):
   - Multiple indicators showing strong agreement
   - Volume/VWAP confirmation of price action
   - Clear trend alignment across indicators
   - No significant contradicting signals

2. Medium-Confidence Setups (0.5-0.7):
   - Mixed signals with clear explanation
   - Strong individual signals lacking full confirmation
   - Nearby technical levels that could invalidate analysis

3. Low-Confidence Setups (<0.5):
   - Contradicting signals without resolution
   - Lack of volume confirmation
   - Unusual or unclear market conditions

Key Signal Combinations:
- Momentum Confluence: RSI extremes with MACD crossovers
- Volatility Setups: BB extremes with RSI/MACD confirmation
- Institutional Validation: VWAP breaks with volume and trend alignment
- Reversal Patterns: Multiple indicator divergences

Risk Management Requirements:
- Address any contradicting signals explicitly
- Consider proximity to key technical levels
- Weight recent signals more heavily
- Factor in current market volatility

Respond with a JSON object using exactly this format:
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "Detailed explanation including specific indicator values and signal confluence"
}}`,
  system: `You are a senior cryptocurrency technical analyst responsible for synthesizing multiple technical indicators into actionable trading decisions.

Key Analysis Integration Principles:
- Each indicator provides unique insight:
  * MACD: Trend direction and momentum
  * RSI: Overbought/oversold conditions and divergences
  * Bollinger Bands: Volatility and statistical price levels
  * VWAP: Institutional interest and volume confirmation

Signal Weight Hierarchy:
1. Strong confluence of multiple indicators
2. Contradicting signals require explicit reasoning
3. Recent signals override older ones
4. Volume-confirmed signals carry more weight
5. Extreme readings demand special attention

Risk Assessment Guidelines:
- Higher confidence (0.8-1.0) requires:
  * Multiple indicators showing strong agreement
  * Clear volume confirmation
  * No significant contradicting signals
- Moderate confidence (0.5-0.7) applies when:
  * Mixed signals with logical explanation
  * Strong signals from some indicators but lacking confirmation
  * Technical levels nearby that could invalidate analysis
- Lower confidence (<0.5) warranted with:
  * Contradicting signals without clear resolution
  * Lack of volume confirmation
  * Unusual market conditions

Your analysis must:
- Explicitly address conflicting signals
- Quantify all observations
- Consider timeframe alignment
- Weight institutional activity (VWAP) appropriately
- Account for current market volatility
- Provide clear rationale for chosen confidence level

Remember:
- No single indicator is perfect
- Risk management overrides strong signals
- Pattern convergence is more reliable than any single indicator
- Consider both technical and market structure aspects
- Explain why you're discounting any contradicting signals`,
};
