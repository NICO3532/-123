"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const registerWorker = () => { void navigator.serviceWorker.register("/sw.js"); };
    if ("serviceWorker" in navigator) {
      if (document.readyState === "complete") registerWorker();
      else window.addEventListener("load", registerWorker, { once: true });
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setInstalled(false);
    };
    const handleInstalled = () => { setInstalled(true); setPromptEvent(null); setShowGuide(false); };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("load", registerWorker);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) { setShowGuide(true); return; }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  if (installed) return null;

  return (
    <>
      <button className="install-button" onClick={install}>安装</button>
      {showGuide && (
        <div className="install-sheet" role="presentation" onClick={() => setShowGuide(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(event) => event.stopPropagation()}>
            <span className="section-index">放到手机第一屏</span>
            <h2 id="install-title">需要时，一秒打开</h2>
            <p>iPhone 的 Safari 不会弹出自动安装提示，按下面两步即可。</p>
            <div className="install-steps"><div><span>1</span>点击 Safari 底部的“分享”</div><div><span>2</span>选择“添加到主屏幕”</div></div>
            <button className="primary-action" onClick={() => setShowGuide(false)}>知道了</button>
          </section>
        </div>
      )}
    </>
  );
}
