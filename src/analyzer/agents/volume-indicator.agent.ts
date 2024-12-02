import { BaseAgent } from ".";
import { CalculatedIndicators } from "../types";
import { Prompts, PromptTemplate } from "./prompts";

export class VolumeIndicatorAgent extends BaseAgent {
  public prompts: PromptTemplate = Prompts.Volume;

  protected getAnalysisInput({
    obv,
    mfi,
    adl,
    vwap,
    forceIndex,
  }: CalculatedIndicators) {
    return {
      SYMBOL: this.symbol,
      INTERVAL: this.interval,
      OBV: obv.slice(-1 * this.inputArrayLength).join(","),
      MFI: mfi.slice(-1 * this.inputArrayLength).join(","),
      ADL: adl.slice(-1 * this.inputArrayLength).join(","),
      VWAP: vwap.slice(-1 * this.inputArrayLength).join(","),
      FORCE_INDEX: forceIndex.slice(-1 * this.inputArrayLength).join(","),
    };
  }
}
