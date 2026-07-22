import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RefreshCw, Play, CheckCircle2 } from "lucide-react";

export function DemoControlPanel() {
  const [isResetting, setIsResetting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const startDemoSequence = useMutation(api.demoSequence.startDemoSequence);
  const processDemoChunk = useMutation(api.demoSequence.processDemoChunk);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleReset = async () => {
    if (isResetting || isRunning) return;
    setIsResetting(true);
    try {
      await startDemoSequence();
      showToast("Demo environment initialized & ready.");
    } catch (error) {
      console.error("Failed to reset demo data:", error);
      showToast("Error resetting data.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleRunScenario = async () => {
    if (isResetting || isRunning) return;
    setIsRunning(true);
    
    // Total 7 chunks (0 to 6)
    const totalChunks = 7;
    let currentChunk = 0;

    try {
      showToast("Scenario started — watch the session list and network graph!");
      
      const processNextChunk = async () => {
        if (currentChunk >= totalChunks) {
          setIsRunning(false);
          showToast("Demo scenario completed.");
          return;
        }

        try {
          await processDemoChunk({ stepIndex: currentChunk });
          currentChunk++;
          // Wait 3.5 seconds before next chunk
          setTimeout(processNextChunk, 3500);
        } catch (error) {
          console.error("Error processing demo chunk:", error);
          setIsRunning(false);
          showToast("Error during scenario playback.");
        }
      };

      // Start the loop
      await processNextChunk();

    } catch (error) {
      console.error("Failed to start scenario:", error);
      showToast("Error starting scenario.");
      setIsRunning(false);
    }
  };

  return (
    <>
      {/* Inline control buttons — rendered inside the header via flexbox */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleReset}
          disabled={isResetting || isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50 whitespace-nowrap"
          title="Reset Demo Data"
        >
          <RefreshCw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
          Reset
        </button>
        <button
          onClick={handleRunScenario}
          disabled={isResetting || isRunning}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/50 transition-colors disabled:opacity-50 whitespace-nowrap"
          title="Run Live Scenario"
        >
          {isRunning ? (
             <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
             <Play className="w-3 h-3" />
          )}
          Run Scenario
        </button>
      </div>

      {/* Toast Notification — fixed position for visibility */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded shadow-lg backdrop-blur flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-3 h-3" />
          {toastMessage}
        </div>
      )}
    </>
  );
}
