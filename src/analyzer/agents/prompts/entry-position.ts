export const EntryPosition = {
  human: `The final recommendation from the analysis is "BUY at a price of {CURRENT}" 

Symbol: {SYMBOL}
Interval: {INTERVAL} minutes
Current Market Price: {CURRENT}
  
Please determine the following trading parameters to determine the entry position:

1. Entry Price:
   - Use the current market price history: {CLOSE}.
   - Adjust if necessary based on volatility or support levels.

2. Exit Price (Take Profit):
   - Use a Risk-to-Reward (R:R) ratio of 2:1 or higher.
   - Consider key resistance levels if applicable.

3. Stop Loss:
   - Use the ATR history values: {ATR}.
   - Use the Bollinger Band lower limits if necessary: {BB_LOWER}.
   - Adjust based on recent support levels or Bollinger Band lower limits.

Your response must strictly adhere to the following JSON format:
{{
  "entryPrice": number,
  "exitPrice": number,
  "stopLoss": number,
  "recommendation": Signal,
  "confidence": integer (1-10),
  "rationale": "A detailed explanation of how the values were calculated, including the use of the ATR, R:R ratio, and other relevant indicators."
}}`,
  system: `You are a professional trader specializing in precise trade execution strategies. Your task is to calculate entry, exit, stop loss, and position size for a trade based on the given parameters.

Guidelines for Calculation:
1. **Entry Price**:
   - Start with the current market price.
   - Adjust slightly for recent volatility or support levels if needed.
   - Remember that the "BUY" recommendation is based on the current price, so don't deviate too far from it.

2. **Exit Price (Take Profit)**:
   - Use a Risk-to-Reward (R:R) ratio of 2:1 or higher.
   - Adjust for key resistance levels if applicable.

3. **Stop Loss**:
   - Use the ATR value to set a volatility-based stop loss.
   - Place below recent support levels or Bollinger Band lower limits.

4. **Output**:
   - Provide the values in JSON format.
   - Include a detailed rationale explaining the calculations and adjustments.`,
};
