import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { Prompts } from "../prompts";
import {
  IndicatorAnalysis,
  IndicatorResult,
  OHLCDataInterval,
  TimeSeriesPoint,
} from "../types";

// Base formatter for time series data
function formatTimeSeries(series: TimeSeriesPoint[], label: string): string {
  return series
    .slice(-10) // Get last 10 points for readability
    .map((point) => {
      if (!point.value) {
        throw new Error(`Invalid time series point for ${label}`);
      }
      return `${new Date(point.timestamp).toISOString()}: ${point.value.toFixed(
        2
      )}`;
    })
    .join("\n");
}

// Bollinger Bands Analysis Agent
export class BollingerBandsAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { human, system } = Prompts.BollingerBands;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing Bollinger Bands data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_middle: data.current.middle.toFixed(2),
      current_upper: data.current.upper.toFixed(2),
      current_lower: data.current.lower.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_bandwidth: data.current.bandwidth.toFixed(4),
      current_percentB: data.current.percentB.toFixed(2),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      upper_history: formatTimeSeries(data.history.upper, "upper_history"),
      middle_history: formatTimeSeries(data.history.middle, "middle_history"),
      lower_history: formatTimeSeries(data.history.lower, "lower_history"),
      bandwidth_history: formatTimeSeries(
        data.history.bandwidth,
        "bandwidth_history"
      ),
    };

    return await this.chain.invoke(input);
  }
}

// RSI Analysis Agent
export class RSIAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { human, system } = Prompts.RSI;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing RSI data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_rsi: data.current.rsi.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_avg_gain: data.current.avgGain.toFixed(2),
      current_avg_loss: data.current.avgLoss.toFixed(2),
      rsi_history: formatTimeSeries(data.history.rsi, "rsi_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      avg_gain_history: formatTimeSeries(
        data.history.avgGain,
        "avg_gain_history"
      ),
      avg_loss_history: formatTimeSeries(
        data.history.avgLoss,
        "avg_loss_history"
      ),
    };
    console.log(JSON.stringify(input));
    const response = await this.chain.invoke(input);
    console.log(response);
    return response;
  }
}

export class VWAPAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.VWAP;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing VWAP data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_vwap: data.current.vwap.toFixed(2),
      current_price: data.current.price.toFixed(2),
      current_volume: data.current.volume.toFixed(2),
      price_to_vwap: data.current.priceToVWAP.toFixed(2),
      relative_volume: data.current.relativeVolume.toFixed(2),
      vwap_history: formatTimeSeries(data.history.vwap, "vwap_history"),
      price_history: formatTimeSeries(data.history.price, "price_history"),
      volume_history: formatTimeSeries(
        data.history.relativeVolume,
        "volume_history"
      ),
      relative_volume_history: formatTimeSeries(
        data.history.relativeVolume,
        "relative_volume_history"
      ),
    };

    return await this.chain.invoke(input);
  }
}

export class MACDAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.MACD;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(data: IndicatorResult): Promise<IndicatorAnalysis> {
    this.logger.info("Analyzing MACD data", { data });
    const input = {
      symbol: data.symbol,
      timeframe: data.interval,
      current_macd: data.current.macdLine.toFixed(2),
      current_signal: data.current.signalLine.toFixed(2),
      current_histogram: data.current.histogram.toFixed(2),
      current_price: data.current.price.toFixed(2),
      macd_history: formatTimeSeries(data.history.macdLine, "macd_history"),
      signal_history: formatTimeSeries(
        data.history.signalLine,
        "signal_history"
      ),
      histogram_history: formatTimeSeries(
        data.history.histogram,
        "histogram_history"
      ),
      price_history: formatTimeSeries(data.history.price, "price_history"),
    };

    return await this.chain.invoke(input);
  }
}

// Final Analysis Agent
export class FinalAnalysisAgent {
  private model: ChatOpenAI;
  private parser: JsonOutputParser<IndicatorAnalysis>;
  private chain: RunnableSequence;

  constructor(
    model: ChatOpenAI,
    private readonly logger: Logger,
    private readonly metrics: Metrics
  ) {
    const { system, human } = Prompts.Analysis;
    this.model = model;
    this.parser = new JsonOutputParser<IndicatorAnalysis>();
    const prompt = ChatPromptTemplate.fromMessages([
      ["human", human],
      ["system", system],
    ]);

    this.chain = RunnableSequence.from([prompt, this.model, this.parser]);
  }

  async analyze(
    bbAnalysis: IndicatorAnalysis,
    rsiAnalysis: IndicatorAnalysis,
    macdAnalysis: IndicatorAnalysis,
    vwapAnalysis: IndicatorAnalysis,
    currentPrice: number,
    symbol: string,
    interval: OHLCDataInterval
  ): Promise<IndicatorAnalysis> {
    this.logger.info("Performing final analysis", {
      bbAnalysis,
      rsiAnalysis,
      macdAnalysis,
      vwapAnalysis,
      currentPrice,
    });

    const input = {
      symbol,
      timeframe: interval,
      bb_recommendation: bbAnalysis.recommendation,
      bb_confidence: bbAnalysis.confidence,
      bb_rationale: bbAnalysis.rationale,
      rsi_recommendation: rsiAnalysis.recommendation,
      rsi_confidence: rsiAnalysis.confidence,
      rsi_rationale: rsiAnalysis.rationale,
      macd_recommendation: macdAnalysis.recommendation,
      macd_confidence: macdAnalysis.confidence,
      macd_rationale: macdAnalysis.rationale,
      vwap_recommendation: vwapAnalysis.recommendation,
      vwap_confidence: vwapAnalysis.confidence,
      vwap_rationale: vwapAnalysis.rationale,
      current_price: currentPrice.toFixed(2),
    };

    return await this.chain.invoke(input);
  }
}
