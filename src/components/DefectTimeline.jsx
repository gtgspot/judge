import React from 'react';

export function DefectTimeline({ timeline }) {
  if (!timeline?.length) {
    return <p>No timeline events recorded.</p>;
  }

  return (
    <section className="defect-timeline">
      <h2>Defect Timeline</h2>
      <ul>
        {timeline.map(event => (
          <li key={`${event.timestamp}-${event.summary}`}>
            <time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleString()}</time>
            <div>
              <strong>{event.summary}</strong>
              {event.details && <p>{event.details}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
