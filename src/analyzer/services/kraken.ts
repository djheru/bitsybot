import { PriceData } from "../types";

export async function fetchPriceData() {
  try {
    const url = "https://api.kraken.com/0/public/OHLC";
    const params = new URLSearchParams({
      pair: "BTCUSDT",
      interval: "15", // Interval in minutes (e.g., 5 for 5-minute intervals)
      since: `${Date.now() - 86400000}`, // Fetch data from the last 24 hours
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error && data.error.length > 0) {
      console.error("Error from Kraken API:", data.error);
      return [];
    }

    const dataKey = Object.keys(data.result)
      .filter((key) => key !== "last")
      .pop();

    if (!dataKey) {
      console.error("No OHLC data found");
      return [];
    }

    const ohlcData: Array<
      [number, string, string, string, string, string, string]
    > = data.result[dataKey];

    const priceData: PriceData[] = ohlcData.map((item) => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      vwap: parseFloat(item[5]),
      volume: parseFloat(item[6]),
    }));

    return priceData;
  } catch (error) {
    console.error("Error fetching OHLC data:", error);
    throw error;
  }
}
