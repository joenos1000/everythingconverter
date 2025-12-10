"use client";

import { useState } from "react";
import { AsciiBox } from "./AsciiBox";

export interface BenchmarkResult {
  modelId: string;
  modelName: string;
  result: string;
  explanation: string;
  responseTime: number;
  tokenCount: number;
  estimatedCost: number;
  status: "success" | "error";
  errorMessage?: string;
  rank?: number;
  isWinner?: boolean;
}

interface BenchmarkResultsProps {
  results: BenchmarkResult[];
  conversion: { from: string; to: string };
}

export function BenchmarkResults({ results, conversion }: BenchmarkResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Calculate max values for bar charts
  const maxTime = Math.max(...results.map((r) => r.responseTime));
  const maxTokens = Math.max(...results.map((r) => r.tokenCount));

  // Rank results by response time
  const rankedResults = [...results]
    .sort((a, b) => {
      // Errors go to the end
      if (a.status === "error" && b.status === "success") return 1;
      if (a.status === "success" && b.status === "error") return -1;
      return a.responseTime - b.responseTime;
    })
    .map((result, index) => ({
      ...result,
      rank: result.status === "success" ? index + 1 : undefined,
      isWinner: result.status === "success" && index === 0,
    }));

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      <AsciiBox title={`BENCHMARK RESULTS - "${conversion.from}" to "${conversion.to}"`}>
        <div className="space-y-4">
          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="benchmark-results-table">
              <thead>
                <tr>
                  <th style={{ width: "30px" }}>#</th>
                  <th>MODEL</th>
                  <th style={{ width: "100px" }}>TIME (ms)</th>
                  <th style={{ width: "100px" }}>TOKENS</th>
                  <th style={{ width: "100px" }}>COST ($)</th>
                  <th>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {rankedResults.map((result, index) => (
                  <tr
                    key={index}
                    className={`benchmark-expandable ${result.isWinner ? "winner" : ""} ${
                      result.status === "error" ? "error" : ""
                    }`}
                    onClick={() => toggleExpand(index)}
                  >
                    <td>
                      {result.rank && result.rank <= 3 && (
                        <span className={`benchmark-rank benchmark-rank-${result.rank}`}>
                          #{result.rank}
                        </span>
                      )}
                      {result.rank && result.rank > 3 && <span>#{result.rank}</span>}
                      {result.status === "error" && <span style={{ color: "#FF0000" }}>✗</span>}
                    </td>
                    <td>{result.modelName}</td>
                    <td>{result.status === "success" ? result.responseTime.toFixed(0) : "—"}</td>
                    <td>{result.status === "success" ? result.tokenCount : "—"}</td>
                    <td>
                      {result.status === "success"
                        ? result.estimatedCost
                          ? `$${result.estimatedCost.toFixed(6)}`
                          : "—"
                        : "—"}
                    </td>
                    <td>
                      {result.status === "success"
                        ? result.result.length > 40
                          ? result.result.substring(0, 40) + "..."
                          : result.result
                        : result.errorMessage || "Error"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded details */}
          {expandedIndex !== null && rankedResults[expandedIndex].status === "success" && (
            <div
              className="benchmark-box p-4 mt-2"
              style={{ background: "rgba(0, 255, 255, 0.05)" }}
            >
              <div className="benchmark-text-cyan font-bold mb-2">
                DETAILED BREAKDOWN - {rankedResults[expandedIndex].modelName}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="benchmark-text-yellow">Result:</span>{" "}
                  {rankedResults[expandedIndex].result}
                </div>
                <div>
                  <span className="benchmark-text-yellow">Explanation:</span>{" "}
                  {rankedResults[expandedIndex].explanation}
                </div>
                <div>
                  <span className="benchmark-text-yellow">Response Time:</span>{" "}
                  {rankedResults[expandedIndex].responseTime.toFixed(2)}ms
                </div>
                <div>
                  <span className="benchmark-text-yellow">Tokens:</span>{" "}
                  {rankedResults[expandedIndex].tokenCount}
                </div>
                {rankedResults[expandedIndex].estimatedCost && (
                  <div>
                    <span className="benchmark-text-yellow">Cost:</span> $
                    {rankedResults[expandedIndex].estimatedCost?.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comparison Bars */}
          <div className="space-y-3 mt-6">
            <div className="benchmark-text-cyan text-sm font-bold">RESPONSE TIME COMPARISON:</div>
            {rankedResults
              .filter((r) => r.status === "success")
              .map((result, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-40 text-sm truncate" style={{ color: "#00FF00" }}>
                    {result.modelName}
                  </span>
                  <div
                    className="flex-1 h-4"
                    style={{
                      background: "#000",
                      border: "1px solid #00FF00",
                      position: "relative",
                    }}
                  >
                    <div
                      className="benchmark-comparison-bar"
                      style={{ width: `${(result.responseTime / maxTime) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 text-sm text-right" style={{ color: "#00FF00" }}>
                    {result.responseTime.toFixed(0)}ms
                  </span>
                </div>
              ))}

            <div className="benchmark-text-cyan text-sm font-bold mt-6">TOKEN USAGE:</div>
            {rankedResults
              .filter((r) => r.status === "success")
              .map((result, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-40 text-sm truncate" style={{ color: "#00FF00" }}>
                    {result.modelName}
                  </span>
                  <div
                    className="flex-1 h-4"
                    style={{
                      background: "#000",
                      border: "1px solid #00FF00",
                      position: "relative",
                    }}
                  >
                    <div
                      className="benchmark-comparison-bar"
                      style={{ width: `${(result.tokenCount / maxTokens) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 text-sm text-right" style={{ color: "#00FF00" }}>
                    {result.tokenCount} tokens
                  </span>
                </div>
              ))}
          </div>
        </div>
      </AsciiBox>
    </div>
  );
}
