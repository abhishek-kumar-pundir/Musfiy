import { useState } from "react";
import { usePlaylistStore } from "../stores/usePlaylistStore";

const MoodInput = () => {
  const [mood, setMood] = useState("");
  const { generatePlaylist, loading } = usePlaylistStore();

  const handleSubmit = async () => {
    if (!mood.trim()) return;
    await generatePlaylist(mood);
    setMood("");
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-subtle mb-2.5">
        What are you feeling?
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="rainy evening, headphones on"
          className="input flex-1"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={loading}
        />

        <button
          className="btn btn-primary px-5"
          onClick={handleSubmit}
          disabled={loading || !mood.trim()}
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            "Make a mix"
          )}
        </button>
      </div>
    </div>
  );
};

export default MoodInput;
