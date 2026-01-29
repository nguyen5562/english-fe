import { useEffect, useRef, useState } from "react";

export default function FilePickerWithSvar() {
  const [value, setValue] = useState("");
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // chặn domain lạ
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "FM_PICK" && typeof e.data.url === "string") {
        setValue(e.data.url);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const openPopup = () => {
    // nếu đã mở rồi thì focus
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    popupRef.current = window.open(
      "/file-manager-popup",
      "FileManager",
      "width=1200,height=800"
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          style={{ width: 520, padding: 8 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="URL file sẽ nằm ở đây..."
        />
        <button onClick={openPopup}>Chọn file</button>
      </div>
    </div>
  );
}
