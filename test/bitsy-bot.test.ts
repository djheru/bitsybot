import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { ADXOutput } from "technicalindicators/declarations/directionalmovement/ADX";
import { StochasticOutput } from "technicalindicators/declarations/momentum/Stochastic";
import { MACDOutput } from "technicalindicators/declarations/moving_averages/MACD";
import { KrakenService } from "../src/analyzer/services/kraken";
import {
  getADX,
  getATR,
  getBearishEngulfing,
  getBollingerBands,
  getBullishEngulfing,
  getEMA,
  getMACD,
  getOBV,
  getRSI,
  getStochastic,
  getWilliamsR,
} from "../src/analyzer/services/tools";
import { KrakenOHLCVRow, PriceData } from "../src/analyzer/types";
import {
  adxResults,
  atrResults,
  bearishEngulfingInput,
  bearishEngulfingResults,
  bollingerResults,
  bullishEngulfingInput,
  bullishEngulfingResults,
  emaResults,
  macdResults,
  obvResults,
  responseData,
  rsiResults,
  stochasticResults,
  williamsResults,
} from "./example-response";

jest.mock("@aws-lambda-powertools/logger", () => {
  return {
    Logger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      addContext: jest.fn(),
    })),
  };
});

jest.mock("@aws-lambda-powertools/metrics", () => {
  return {
    Metrics: jest.fn(() => ({
      addMetric: jest.fn(),
      publishStoredMetrics: jest.fn(),
    })),
  };
});

const candles: KrakenOHLCVRow[] = responseData.XBTUSDT;

describe("Indicators Module - ", () => {
  let data: PriceData;

  beforeAll(() => {
    const mockLogger = new Logger();
    const mockMetrics = new Metrics();

    const marketService = new KrakenService(
      "XBTUSDT",
      15,
      mockLogger,
      mockMetrics,
      250
    );

    data = marketService.formatPriceData(candles);
  });

  describe("trend-following indicators", () => {
    test("EMA should be calculated correctly", () => {
      const response = getEMA(data);
      expect(response).toEqual(emaResults);
    });

    test("MACD should be calculated correctly", () => {
      const response = getMACD(data);
      expect(response).toMatchObject<MACDOutput[]>(macdResults);
    });

    test("ADX should be calculated correctly", () => {
      const response = getADX(data);
      expect(response).toMatchObject<ADXOutput[]>(adxResults);
    });
  });

  describe("momentum indicators", () => {
    test("RSI should be calculated correctly", () => {
      const response = getRSI(data);
      expect(response).toEqual(rsiResults);
    });

    test("Stochastic should be calculated correctly", () => {
      const response = getStochastic(data);
      // console.log(JSON.stringify(response, null, 2));
      expect(response).toMatchObject<Partial<StochasticOutput>[]>(
        stochasticResults
      );
    });

    test("Williams R should be calculated correctly", () => {
      const response = getWilliamsR(data);
      expect(JSON.stringify(response)).toEqual(JSON.stringify(williamsResults));
    });
  });

  describe("volatility indicators", () => {
    test("Bollinger Bands should be calculated correctly", () => {
      const response = getBollingerBands(data);
      expect(response).toEqual(bollingerResults);
    });

    test("ATR should be calculated correctly", () => {
      const response = getATR(data);
      expect(response).toMatchObject<number[]>(atrResults);
    });
  });

  describe("volume-based indicators", () => {
    test("OBV should be calculated correctly", () => {
      const response = getOBV(data);
      expect(response).toMatchObject<number[]>(obvResults);
    });
  });

  describe("candlestick indicators", () => {
    test("Bullish Engulfing should be identified correctly", () => {
      const response = getBullishEngulfing(bullishEngulfingInput);
      expect(response).toEqual(bullishEngulfingResults);
    });
    test("Bearish Engulfing should be identified correctly", () => {
      const response = getBearishEngulfing(bearishEngulfingInput);
      expect(response).toEqual(bearishEngulfingResults);
    });
  });
});
