import { File, Download, FileText, FileImage, FileAudio, FileVideo } from "lucide-react";

interface FilePreviewProps {
  fileName: string;
  fileSize?: number;
  fileType?: string;
  downloadUrl?: string;
}

export function FilePreview({ fileName, fileSize, fileType, downloadUrl }: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = () => {
    if (!fileType) return <File size={24} />;

    if (fileType.startsWith("image/")) return <FileImage size={24} />;
    if (fileType.startsWith("audio/")) return <FileAudio size={24} />;
    if (fileType.startsWith("video/")) return <FileVideo size={24} />;
    if (fileType.includes("text") || fileType.includes("json")) return <FileText size={24} />;

    return <File size={24} />;
  };

  const getFileExtension = () => {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
  };

  return (
    <div className="bg-background border rounded-lg p-4 w-full max-w-md">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground">
          {getFileIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={fileName}>
            {fileName}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {getFileExtension() && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">
                {getFileExtension()}
              </span>
            )}
            {fileSize && (
              <span className="text-xs text-muted-foreground">
                {formatFileSize(fileSize)}
              </span>
            )}
          </div>
        </div>

        {downloadUrl && (
          <button
            onClick={() => window.open(downloadUrl, "_blank")}
            className="flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
            title="Download file"
          >
            <Download size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}