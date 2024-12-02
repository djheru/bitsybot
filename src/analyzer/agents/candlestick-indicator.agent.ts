import { BaseAgent } from ".";
import { CalculatedIndicators } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class CandlestickIndicatorAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.Candlestick;

  getAnalysisInput({
    bullishEngulfing,
    morningStar,
    hammer,
    threeWhiteSoldiers,
    bearishEngulfing,
    eveningStar,
    shootingStar,
    threeBlackCrows,
    doji,
    dragonflyDoji,
    gravestoneDoji,
  }: CalculatedIndicators) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      BULLISH_ENGULFING: bullishEngulfing,
      MORNING_STAR: morningStar,
      HAMMER: hammer,
      THREE_WHITE_SOLDIERS: threeWhiteSoldiers,
      BEARISH_ENGULFING: bearishEngulfing,
      EVENING_STAR: eveningStar,
      SHOOTING_STAR: shootingStar,
      THREE_BLACK_CROWS: threeBlackCrows,
      DOJI: doji,
      DRAGONFLY_DOJI: dragonflyDoji,
      GRAVESTONE_DOJI: gravestoneDoji,
    };
  }
}
