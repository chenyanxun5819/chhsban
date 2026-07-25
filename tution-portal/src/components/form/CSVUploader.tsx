import React, { useRef, useState } from "react";
import "./form.css";

interface CSVUploaderProps {
  onUpload: (data: string[][]) => void;
  accept?: string;
  disabled?: boolean;
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({
  onUpload,
  accept = ".csv,.xlsx",
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split("\n");
    return lines.map((line) =>
      line.split(",").map((cell) => cell.trim())
    );
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      onUpload(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error parsing file";
      setError(message);
      setFileName("");
    }
  };

  return (
    <div className="csv-uploader">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className="btn btn-secondary"
      >
        📁 選擇檔案
      </button>
      {fileName && <span className="file-name">已選擇: {fileName}</span>}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};
