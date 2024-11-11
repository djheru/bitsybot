export const VWAP = {
  human: `Analyze the provided VWAP data to generate a trading recommendation for {symbol} on {timeframe} timeframe.

Current Market Data:
-------------------
Symbol: {symbol}
Price: {current_price}
VWAP: {current_vwap}
Price to VWAP: {price_to_vwap}%
Volume Strength: {relative_volume}x
Current Volume: {current_volume}

Historical Data (Last 10 periods):
---------------------------------
Price Movement: {price_history}
VWAP Values: {vwap_history}
Volume Profile: {volume_history}
Relative Volume: {relative_volume_history}

Analysis Requirements:
---------------------
1. Price/VWAP Relationship (40% weight)
   - Distance from VWAP
   - Price crosses
   - Rejection/acceptance
   - Historical relationship

2. Volume Analysis (30% weight)
   - Volume strength
   - Volume trends
   - Price/volume divergence
   - Historical context

3. Trend Analysis (20% weight)
   - VWAP slope
   - Price momentum
   - Support/resistance tests
   - Trend strength

4. Context Analysis (10% weight)
   - Current market phase
   - Institutional levels
   - Market structure
   - Historical pattern context

Signal Confidence Guidelines:
---------------------------
High (0.8-1.0):
- Strong volume confirmation
- Clear VWAP relationship
- Multiple confirming factors
- Clear trend direction

Medium (0.5-0.7):
- Moderate volume support
- Mixed VWAP signals
- Developing patterns
- Unclear trend

Low (<0.5):
- Weak volume
- Price/VWAP confusion
- Contradicting signals
- No clear direction

You must respond with a JSON object in exactly this format:
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": <number between 0 and 1>,
  "rationale": "Structure your rationale exactly as follows:

Primary Signal: One sentence describing the main signal
- Price relation to VWAP
- Volume context

Key Metrics:
- VWAP Distance: [value]% ([above/below])
- Volume Strength: [value]x average
- Price: [current] vs VWAP: [value]
- Volume Trend: [increasing/decreasing]

Risk Factors:
- List 2-3 key risks
- Include specific values
- Note invalidation points

Key Levels:
- VWAP: [value]
- Price: [current]
- Volume Threshold: [value]x average
- Support/Resistance: [values]"
}}`,
  system: `You are an expert cryptocurrency technical analyst specializing in Volume-Weighted Average Price (VWAP) analysis.

Key VWAP Analysis Principles:
- VWAP represents the true average price weighted by volume, indicating institutional interest levels
- Price above VWAP suggests bullish sentiment, below suggests bearish sentiment
- The further price moves from VWAP, the more likely a reversion
- High volume at VWAP levels indicates strong price agreement
- Low volume divergence from VWAP often suggests unsustainable price movement
- Relative volume analysis helps confirm price moves

Your analysis should:
- Quantify price deviations from VWAP (exact percentages)
- Consider relative volume levels compared to recent averages
- Identify key volume patterns and their implications
- Note when volume confirms or contradicts price movement
- Be explicit about institutional trading implications
- Consider market microstructure (e.g., large orders splitting)

Remember: VWAP is particularly important during active trading hours and for institutional order execution. Weight your confidence based on volume relevance and market activity levels.`,
};
