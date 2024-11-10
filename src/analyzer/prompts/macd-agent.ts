export const MACD = {
  human: `Analyze the provided MACD (Moving Average Convergence Divergence) data to generate a trading recommendation.

Market Context:
Symbol: {symbol}

Current MACD Metrics:
--------------------
Price: {current_price}
MACD Line: {current_macd}
Signal Line: {current_signal}
Histogram: {current_histogram}

Historical Data (Last 10 periods):
---------------------------------
Price Movement:
{price_history}

MACD Components:
MACD Line: {macd_history}
Signal Line: {signal_history}
Histogram: {histogram_history}

Analysis Requirements:
---------------------
1. Signal Line Crossovers (40% weight)
   - MACD crossing above signal line (bullish)
   - MACD crossing below signal line (bearish)
   - Distance from zero line during crossover
   - Crossover angle/momentum
   - Historical reliability of recent crossovers

2. Histogram Analysis (25% weight)
   - Current histogram trend (increasing/decreasing)
   - Histogram size relative to recent average
   - Rate of change in histogram
   - Histogram divergence from price
   - Zero-line rejections

3. Centerline Analysis (20% weight)
   - Position relative to zero line
   - Recent centerline crossovers
   - Time spent above/below zero
   - Strength of moves from centerline
   - Failed centerline tests

4. Divergence Patterns (15% weight)
   Regular Divergence:
   - Bearish: Higher highs in price, lower highs in MACD
   - Bullish: Lower lows in price, higher lows in MACD
   
   Hidden Divergence:
   - Bearish: Lower highs in price, higher highs in MACD
   - Bullish: Higher lows in price, lower lows in MACD

Signal Confidence Guidelines:
---------------------------
High Confidence (0.8-1.0):
- Clear signal line crossover with volume confirmation
- Strong histogram momentum
- Multiple confirming factors
- Clear trend direction from zero line
- Divergence with strong price action

Medium Confidence (0.5-0.7):
- Signal line crossover without full confirmation
- Moderate histogram momentum
- Mixed signals between components
- Unclear zero line direction
- Developing but incomplete patterns

Low Confidence (<0.5):
- Weak or unclear crossovers
- Contradicting signals
- Minimal histogram momentum
- Choppy price action
- Failed pattern development

Provide your rationale in a clear, concise format focusing on:
1. Primary Signal: The most important pattern/signal you've identified
2. Supporting Evidence: Key metrics supporting your recommendation
3. Risk Factors: What could invalidate your analysis
4. Next Levels: Key price levels to watch

Keep the explanation clear and actionable, focusing on what matters most for the trading decision."

Response Format:
---------------
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "Analysis rationale summary, including factors discussed above"
}}

Note: MACD is a trend-following momentum indicator. Consider:
- False signals are common in ranging markets
- Strong trends can override typical reversal signals
- Histogram changes often precede price moves
- Zero-line rejections can be powerful signals
- Volume confirmation increases signal reliability`,
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
