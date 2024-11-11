export const MACD = {
  human: `Analyze the provided MACD data to generate a trading recommendation for {symbol} on {timeframe} timeframe.

Current Market Data:
-------------------
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

Response Format:
---------------
{{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": number between 0 and 1,
  "rationale": "Format your rationale as follows:
    Primary Signal: Current MACD setup and main signal
    Key Metrics: MACD, Signal, and Histogram values with context
    Risk Factors: Potential signal invalidation points
    Key Levels: Critical MACD and price levels to monitor"
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
