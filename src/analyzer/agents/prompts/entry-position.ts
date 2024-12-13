export const EntryPosition = {
  type: "entry-position",
  human: `The final recommendation from the analysis is "BUY at a price of {CURRENT}".

Symbol: {SYMBOL}
Interval: {INTERVAL} minutes
Current Market Price: {CURRENT}
Order Book Asks:
{ORDER_BOOK_ASKS}
Order Book Bids:
{ORDER_BOOK_BIDS}

Please determine the following trading parameters to define the entry position. 
Below are the base recommendations for the entry, exit, and stop loss prices, along with a base rationale. Use these as a guide to your own analysis. 

Base Recommendations for Trading Parameters:

Entry Price Base Recommendation: {BASE_ENTRY_PRICE}
Exit Price Base Recommendation: {BASE_EXIT_PRICE}
Stop Loss Base Recommendation: {BASE_STOPLOSS_PRICE}
Rationale for Base Recommendations:
{BASE_RATIONALE}

---

Using the base recommendations above, I would like you to calculate your best guess at a profitable entry position.
The base recommendations are a starting point, but use your own reasoning and analysis to adjust the values as needed and generate a custom recommendation that will provide better results. I know you can do it!

Use the guidelines below to calculate the entry, exit, and stop loss prices for the trade.

1. Entry Price:
   - Use the current market price history: {CLOSE}.
   - Adjust if necessary based on volatility or support levels.

2. Exit Price (Take Profit):
   - Use a Risk-to-Reward (R:R) ratio of 3:1 or higher to target greater profitability.
   - Evaluate key resistance levels and consider the potential for sustained momentum beyond those levels.
   - Consider the Bollinger Band upper limits: {BB_UPPER}.
   - Adjust for strong momentum signals from RSI, allowing for more aggressive targets if indicators confirm bullish momentum: {RSI}.
   - Adjust for strong momentum signals from ROC, allowing for more aggressive targets if indicators confirm bullish momentum: {ROC}.
   - Adjust the exit price upwards, provided there is strong confirmation of bullish momentum and sufficient volume to support higher price targets.
   - Prioritize balancing profit potential with the likelihood of achieving the target, ensuring realistic but ambitious price levels.

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
  "rationale": "A detailed explanation of how the values were calculated, including how the exit price balances profitability and success rate, the use of ATR, R:R ratio, Bollinger Band lower limits, and buffer adjustments for the stop loss."
}}`,
  system: `You are a professional trader specializing in precise trade execution strategies. Your task is to calculate entry, exit, stop loss, and position size for a trade based on the given parameters, including recent order book data.

Guidelines for Calculation:
1. **Entry Price**:
   - Start with the current market price.
   - Utilize the order book data, specifically the top 5 asks and bids, to identify optimal entry points:
     - Look for price levels with significant bid volume to determine strong support areas for a "BUY" recommendation.
     - Adjust the entry price slightly above the highest bid if supported by market conditions and trend indicators.
   - Consider recent volatility or support levels to refine the entry price further.

2. **Exit Price (Take Profit)**:
   - Aim for a **higher profitability target** by using a Risk-to-Reward (R:R) ratio of 3:1 or higher.
   - Analyze the order book data, focusing on significant ask volume levels, to identify potential resistance points and refine the exit price.
   - Prioritize setting the exit price beyond key resistance levels when supported by strong bullish indicators such as volume and trend continuation signals.
   - Strive to maximize profit margins while ensuring a high probability of reaching the target.

3. **Stop Loss**:
   - Use the ATR value to set a volatility-based stop loss.
   - Incorporate a **buffer** below the calculated stop loss to reduce the chance of premature triggering:
     - Multiply the ATR value by ATR Buffer (e.g., {ATR_BUFFER}) for a wider stop loss.
     - Alternatively, add a margin (e.g., {BB_BUFFER}% of price) below the Bollinger Band lower limit.
   - Adjust further based on recent support levels or extreme market volatility, taking into account significant bid volume in the order book to avoid setting the stop loss near heavily defended support levels.

4. **Output**:
   - Provide the values in JSON format.
   - Include a detailed rationale explaining the calculations and adjustments, explicitly referencing the use of order book data (asks and bids), ATR, Bollinger Bands, and R:R ratio.
   - Highlight how the exit price calculation prioritizes higher profit margins while maintaining a strong likelihood of being reached.`,
};
