export const MACD = {
  human: `Analyze the provided MACD data to generate a trading recommendation for {symbol} on {timeframe} timeframe.

Current Market Data:
-------------------
Symbol: {symbol}
Price: {current_price}
MACD Line: {current_macd}
Signal Line: {current_signal}
Histogram: {current_histogram}

Historical Data (Last 10 periods):
---------------------------------
MACD Line: {macd_history}
Signal Line: {signal_history}
Histogram: {histogram_history}
Price: {price_history}

Analysis Requirements:
---------------------
1. Signal Line Analysis (40% weight)
   - MACD/Signal crossovers
   - Distance from zero line
   - Crossover momentum
   - Historical reliability

2. Pattern Recognition (30% weight)
   - Histogram patterns
   - Divergence setups
   - Zero-line tests
   - Trend strength

3. Momentum Analysis (20% weight)
   - Histogram size changes
   - MACD slope
   - Signal line slope
   - Rate of change

4. Context Analysis (10% weight)
   - Current trend phase
   - Volume confirmation
   - Market structure
   - Nearby key levels

Signal Confidence Guidelines:
---------------------------
High (0.8-1.0):
- Clear signal line crossover
- Strong histogram momentum
- Multiple confirming factors
- Clear trend direction

Medium (0.5-0.7):
- Developing crossover
- Moderate momentum
- Mixed signals
- Unclear trend

Low (<0.5):
- Weak/unclear crossovers
- Minimal momentum
- Contradicting signals
- Choppy price action

You must respond with a properly-escaped JSON object in exactly this format:
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": <number between 0 and 1>,
  "rationale": "Primary Signal: One sentence describing the main signal\\n- Current MACD setup\\n- Key crossover or trend status\\n\\nKey Metrics:\\n- MACD Line: [value] ([above/below] signal)\\n- Signal Line: [value]\\n- Histogram: [value] ([increasing/decreasing])\\n- Trend Status: [above/below] zero line\\n\\nRisk Factors:\\n- List 2-3 key risks\\n- Include specific values\\n- Note invalidation points\\n\\nKey Levels:\\n- MACD: [value] (signal line)\\n- Zero Line: [distance]\\n- Price: [current] / [target]"
}}`,
  system: `You are an expert cryptocurrency technical analyst specializing in Moving Average Convergence Divergence (MACD) analysis.

Key MACD Analysis Principles:
- MACD is both a trend-following and momentum indicator
- Signal reliability varies based on market conditions and timeframes
- Focus on four key signals:
  1. MACD/Signal Line Crossovers (primary signals)
  2. Centerline Crossovers (trend confirmation)
  3. Divergences with price (potential reversals)
  4. Histogram patterns (momentum changes)
- Be aware of MACD's lagging nature for extremely volatile markets

Your analysis should:
- Quantify all observations (exact values for MACD line, signal line, histogram)
- Identify the stage of any signal (early, confirmed, mature, exhausted)
- Note the strength of momentum using histogram size and changes
- Consider convergence/divergence with price action
- Look for histogram pattern changes that precede price moves
- Address signal validity in current market context

Remember: 
- False signals are common during ranging markets
- Strong trends can override typical reversal signals
- Multiple timeframe confirmation increases signal reliability
- Recent momentum changes (histogram) often precede price moves
- Zero-line rejections can be powerful trend confirmation signals`,
};
