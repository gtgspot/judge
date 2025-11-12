import React from 'react';

export function FileUploader({ onUpload }) {
  const handleChange = event => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="file-uploader">
      <label htmlFor="file-input">Upload case file</label>
      <input id="file-input" type="file" accept=".txt,.pdf,.docx" onChange={handleChange} />
    </div>
  );
}
