export class TimelineManager {
  constructor() {
    this.timeline = [];
  }

  addEvent(event) {
    this.timeline.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    this.timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  getTimeline() {
    return [...this.timeline];
  }
}
