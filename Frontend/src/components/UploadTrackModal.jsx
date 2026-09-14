import { useState } from "react";
import { useTrackStore } from "../stores/useTrackStore";
import { Upload, X, Loader2, FileAudio } from "lucide-react";

const UploadTrackModal = () => {
  const { uploadTrack, loading } = useTrackStore();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async () => {
    if (!file || !title.trim()) return;
    const formData = new FormData();
    formData.append("track", file);
    formData.append("title", title);
    formData.append("artist", artist);
    await uploadTrack(formData);
    setFile(null);
    setTitle("");
    setArtist("");
    setOpen(false);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]?.type.startsWith("audio/")) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const fmtSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
  };

  return (
    <>
      <button
        className="btn btn-ghost text-sm text-muted hover:text-base-content border border-edge"
        onClick={() => setOpen(true)}
      >
        <Upload size={15} />
        Select audio file
      </button>
      <p className="text-[11px] text-subtle mt-2">MP3 · WAV · OGG · M4A</p>

      {open && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm p-5">

            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">Upload track</p>
              <button className="btn btn-xs btn-ghost btn-circle text-subtle" onClick={() => setOpen(false)}>
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Track title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <input
                type="text"
                placeholder="Artist"
                className="input"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />

              <div
                className={`relative border border-dashed rounded-lg p-5 text-center transition-colors duration-150 ${
                  dragActive ? "border-primary bg-primary/5" : "border-edge"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="audio/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                />

                {file ? (
                  <div className="flex items-center gap-2.5 text-left">
                    <FileAudio size={18} className="text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{file.name}</p>
                      <p className="text-[11px] text-subtle">{fmtSize(file.size)}</p>
                    </div>
                    <button
                      className="text-[11px] text-subtle hover:text-error flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium">Drop an audio file here</p>
                    <p className="text-[11px] text-subtle mt-0.5">or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUpload}
                disabled={!file || !title.trim() || loading}
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : "Upload"}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
};

export default UploadTrackModal;
