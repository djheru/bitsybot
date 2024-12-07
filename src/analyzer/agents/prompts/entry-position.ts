export const EntryPosition = {
  type: "entry-position",
  human: `The final recommendation from the analysis is "BUY at a price of {CURRENT}".

Symbol: {SYMBOL}
Interval: {INTERVAL} minutes
Current Market Price: {CURRENT}

Please determine the following trading parameters to define the entry position:

1. Entry Price:
   - Use the current market price history: {CLOSE}.
   - Adjust if necessary based on volatility or support levels.

2. Exit Price (Take Profit):
   - Use a Risk-to-Reward (R:R) ratio of 2:1 or higher.
   - Consider key resistance levels if applicable.

3. Stop Loss:
   - Use the ATR history values: {ATR}.
   - Use the Bollinger Band lower limits if necessary: {BB_LOWER}.
   - Add a buffer below the calculated stop loss to account for minor price dips:
       - Buffer = {ATR_BUFFER} × ATR or {BB_BUFFER}% below the lower Bollinger Band limit.
   - Adjust further based on recent support levels or market volatility to prevent premature triggering.

Your response must strictly adhere to the following JSON format:
{{
  "entryPrice": number,
  "exitPrice": number,
  "stopLoss": number,
  "recommendation": "BUY",
  "confidence": integer (1-10),
  "rationale": "A detailed explanation of how the values were calculated, including the use of the ATR, R:R ratio, Bollinger Band lower limits, and buffer adjustments."
}}`,
  system: `You are a professional trader specializing in precise trade execution strategies. Your task is to calculate entry, exit, stop loss, and position size for a trade based on the given parameters.

Guidelines for Calculation:
1. **Entry Price**:
   - Start with the current market price.
   - Adjust slightly for recent volatility or support levels if needed.

2. **Exit Price (Take Profit)**:
   - Use a Risk-to-Reward (R:R) ratio of 2:1 or higher.
   - Adjust for key resistance levels if applicable.

3. **Stop Loss**:
   - Use the ATR value to set a volatility-based stop loss.
   - Incorporate a **buffer** below the calculated stop loss to reduce the chance of premature triggering:
     - Multiply the ATR value by ATR Buffer (e.g., {ATR_BUFFER}) for a wider stop loss.
     - Alternatively, add a margin (e.g., {BB_BUFFER}% of price) below the Bollinger Band lower limit.
   - Adjust further based on recent support levels or extreme market volatility.

4. **Output**:
   - Provide the values in JSON format.
   - Include a detailed rationale explaining the calculations and adjustments, especially the use of buffers for the stop loss to account for minor dips in price.`,
};
