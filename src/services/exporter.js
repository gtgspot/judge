export class ExportManager {
  constructor(button, engine) {
    this.button = button;
    this.engine = engine;
    if (this.button) {
      this.button.addEventListener("click", () => this.exportReport());
    }
  }

  async exportReport() {
    const snapshot = this.engine.getSnapshot();
    const insights = this.engine.computeGlobalInsights();
    const exportPayload = {
      generatedAt: new Date().toISOString(),
      currentAnalysis: snapshot.currentAnalysis,
      crossAnalysis: snapshot.currentIntelligence,
      insights,
      timeline: snapshot.analyses,
      statutes: snapshot.statutes,
      patterns: snapshot.patterns,
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json",
    });

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `analysis-report-${Date.now()}.json`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);
  }
}
