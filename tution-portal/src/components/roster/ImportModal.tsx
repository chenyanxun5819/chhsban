import React from "react";

interface ImportModalProps {
  show: boolean;
  onConfirm: (file: File) => Promise<void>;
  onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({
  show,
  onConfirm,
  onClose,
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string[][]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split("\n").filter((line) => line.trim());
    return lines.map((line) =>
      line.split(",").map((col) => col.trim().replace(/^"|"$/g, ""))
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("請選擇 CSV 文件");
      setFile(null);
      setPreview([]);
      return;
    }

    setFile(selectedFile);
    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        setPreview(rows.slice(0, 5)); // 只顯示前 5 行
      } catch (err) {
        setError("CSV 文件格式錯誤");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("請選擇文件");
      return;
    }

    setLoading(true);
    try {
      await onConfirm(file);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "導入失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>匯入學生名單</h3>
          <button
            className="close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="file-upload">
            <label htmlFor="csv-file">選擇 CSV 文件</label>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
              className="file-input"
            />
            <small className="help-text">
              CSV 格式: 學號, 中文姓名, 英文姓名, 班級
            </small>
          </div>

          {preview.length > 0 && (
            <div className="preview">
              <h4>預覽 (前 5 行)</h4>
              <table className="preview-table">
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {file && !error && (
            <div className="file-info">
              <p>
                文件: <strong>{file.name}</strong>
              </p>
              <p>
                大小: <strong>{(file.size / 1024).toFixed(2)} KB</strong>
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !file}
          >
            {loading ? "匯入中..." : "確認匯入"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
