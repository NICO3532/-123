"use client";

import { useEffect, useMemo, useState } from "react";
import PwaInstall from "./pwa-install";

type Trigger = "无聊" | "焦虑" | "孤独" | "性冲动";

const triggerActions: Record<Trigger, { title: string; detail: string }> = {
  无聊: { title: "把身体叫回来", detail: "手机放下，做 10 个俯卧撑。只做 10 个，不追加任务。" },
  焦虑: { title: "把担心写成一句话", detail: "写下：我现在担心的是____。写完就停，不解决它。" },
  孤独: { title: "发出一个真实连接", detail: "给一个信任的人发一句：在干嘛？不用解释自己的状态。" },
  性冲动: { title: "先换一个空间", detail: "把手机留在原地，去洗把脸或接一杯水，90 秒后再决定。" },
};

const facts = [
  { kicker: "注意力", title: "没有可信的“下降 X%”", copy: "研究更支持的是：问题性使用可能与冲动控制困难有关，但一般执行功能研究结果并不一致。别用假数字吓自己。" },
  { kicker: "视力", title: "色情内容不会直接让视力下降", copy: "真正可见的代价来自长时间盯屏、眼干和挤占睡眠，而不是一种可计算的“色情视力损伤率”。" },
  { kicker: "大脑", title: "没有“永久损伤 X%”的结论", copy: "需要警惕的不是一次观看，而是失控、反复耗时、用它逃避焦虑或孤独，并开始影响睡眠、工作和关系。" },
];

function formatHours(minutes: number) {
  const hours = (minutes * 365) / 60;
  return hours >= 100 ? Math.round(hours).toString() : hours.toFixed(1);
}

export default function Home() {
  const [minutes, setMinutes] = useState(30);
  const [trigger, setTrigger] = useState<Trigger>("无聊");
  const [seconds, setSeconds] = useState(90);
  const [timerState, setTimerState] = useState<"idle" | "running" | "done">("idle");
  const [saved, setSaved] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [savedMinutes, setSavedMinutes] = useState(0);
  const [showFriction, setShowFriction] = useState(false);

  useEffect(() => {
    setSavedCount(Number(window.localStorage.getItem("pause-saved-count") ?? 0));
    setSavedMinutes(Number(window.localStorage.getItem("pause-saved-minutes") ?? 0));
  }, []);

  useEffect(() => {
    if (timerState !== "running") return;
    if (seconds <= 0) { setTimerState("done"); return; }
    const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [seconds, timerState]);

  const yearlyHours = useMemo(() => formatHours(minutes), [minutes]);
  const yearlyDays = useMemo(() => ((minutes * 365) / 60 / 24).toFixed(1), [minutes]);
  const circleOffset = 301.6 * (seconds / 90);

  function chooseThisTime() {
    if (saved) return;
    const nextCount = savedCount + 1;
    const nextMinutes = savedMinutes + minutes;
    window.localStorage.setItem("pause-saved-count", String(nextCount));
    window.localStorage.setItem("pause-saved-minutes", String(nextMinutes));
    setSavedCount(nextCount);
    setSavedMinutes(nextMinutes);
    setSaved(true);
    setShowFriction(false);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">停</div>
        <div><strong>先停一下</strong><span>不是禁止，是把选择权拿回来</span></div>
        <div className="topbar-actions"><PwaInstall /><div className="saved-pill" aria-label={`已经守住 ${savedCount} 次`}><span>{savedCount}</span> 次</div></div>
      </header>

      <section className="decision-panel" aria-labelledby="decision-title">
        <div className="eyebrow"><span /> 冲动正在发生</div>
        <h1 id="decision-title">你确定要把<br />这一刻交出去吗？</h1>
        <p className="lead">先不用发誓戒掉。只给自己 90 秒，再做一次清醒的决定。</p>

        <div className="trigger-wrap">
          <p>我现在更像是</p>
          <div className="trigger-grid" role="group" aria-label="选择现在的状态">
            {(Object.keys(triggerActions) as Trigger[]).map((item) => (
              <button className={trigger === item ? "trigger active" : "trigger"} key={item} onClick={() => setTrigger(item)} aria-pressed={trigger === item}>{item}</button>
            ))}
          </div>
        </div>

        <div className="timer-card">
          <div className="timer-ring" aria-label={`倒计时 ${seconds} 秒`}>
            <svg viewBox="0 0 112 112" aria-hidden="true">
              <circle className="ring-track" cx="56" cy="56" r="48" />
              <circle className="ring-progress" cx="56" cy="56" r="48" style={{ strokeDashoffset: circleOffset }} />
            </svg>
            <div><strong>{timerState === "done" ? "好了" : seconds}</strong><span>{timerState === "done" ? "重新选择" : "秒"}</span></div>
          </div>
          <div className="timer-copy">
            <span>现在只做这一件事</span>
            <h2>{triggerActions[trigger].title}</h2>
            <p>{triggerActions[trigger].detail}</p>
          </div>
        </div>

        {timerState === "idle" && <button className="primary-action" onClick={() => setTimerState("running")}>我愿意先等 90 秒 <span>→</span></button>}
        {timerState === "running" && <button className="primary-action quiet" disabled>不操作，让这一阵过去</button>}
        {timerState === "done" && !saved && (
          <div className="decision-actions">
            <button className="primary-action success" onClick={chooseThisTime}>这次不看了 <span>✓</span></button>
            <button className="secondary-action" onClick={() => setShowFriction(true)}>我仍然想看</button>
          </div>
        )}
        {saved && <div className="success-card" role="status"><span>✓</span><div><strong>这次是你做的决定。</strong><p>现在把手机放远，去完成刚才那个小动作。</p></div></div>}
      </section>

      <section className="cost-section" aria-labelledby="cost-title">
        <div className="section-heading">
          <div><span className="section-index">01 / 看得见的代价</span><h2 id="cost-title">别算“伤害率”，<br />算你真的会失去什么。</h2></div>
          <p>拖动到你一次通常会花掉的时间。下面只做数学换算，不假装是医学预测。</p>
        </div>
        <div className="calculator-card">
          <div className="slider-label"><span>一次通常花费</span><strong>{minutes}<small> 分钟</small></strong></div>
          <input type="range" min="5" max="90" step="5" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} aria-label="一次观看花费的分钟数" style={{ "--range": `${((minutes - 5) / 85) * 100}%` } as React.CSSProperties} />
          <div className="cost-grid">
            <article><span>如果每天一次，一年</span><strong>{yearlyHours}<small> 小时</small></strong><p>≈ {yearlyDays} 个完整的 24 小时</p></article>
            <article><span>如果每天一次，一周</span><strong>{((minutes * 7) / 60).toFixed(1)}<small> 小时</small></strong><p>这是你任何时间都会付出的成本</p></article>
          </div>
        </div>
        <div className="facts-grid">
          {facts.map((fact, index) => (
            <article className="fact-card" key={fact.kicker}><span className="fact-number">0{index + 1}</span><div><span className="fact-kicker">{fact.kicker}</span><h3>{fact.title}</h3><p>{fact.copy}</p></div></article>
          ))}
        </div>
      </section>

      <section className="pattern-section" aria-labelledby="pattern-title">
        <span className="section-index">02 / 真正要切断的回路</span>
        <h2 id="pattern-title">你要对付的不是性欲，<br />是“难受 → 立刻逃走”。</h2>
        <div className="loop" aria-label="冲动循环">
          <div><span>01</span><strong>无聊 / 焦虑 / 孤独</strong><p>不想独自待着</p></div><i>→</i>
          <div><span>02</span><strong>寻找高刺激</strong><p>瞬间只剩当下</p></div><i>→</i>
          <div><span>03</span><strong>短暂释放</strong><p>随后疲惫或后悔</p></div><i>↺</i>
        </div>
        <p className="pattern-note">每次停 90 秒，不是在证明你“自律”，而是在练习：难受出现时，我不必马上服从。</p>
      </section>

      <section className="record-section">
        <div><span className="section-index">03 / 只记录赢回来的东西</span><h2>你已经把 <em>{savedMinutes}</em> 分钟<br />还给了自己。</h2><p>数据只保存在这台设备。没有账号，没有排行榜，也不惩罚中断。</p></div>
        <div className="record-orb"><div><strong>{savedCount}</strong><span>次清醒选择</span></div></div>
      </section>

      <section className="evidence-note">
        <h2>这页为什么不写吓人的百分比？</h2>
        <p>因为“色情让专注力下降多少、视力下降多少、大脑损伤多少”没有适用于个人的可靠统一数字。更诚实的判断标准是：它是否反复失控、占用大量时间，或开始影响你的睡眠、工作、关系和情绪调节。如果答案是“是”，求助心理咨询师或精神科/身心科医生，比继续自责更有效。</p>
        <div className="source-links">
          <a href="https://www.mayoclinic.org/diseases-conditions/compulsive-sexual-behavior/symptoms-causes/syc-20360434" target="_blank" rel="noreferrer">Mayo Clinic：何时需要警惕 ↗</a>
          <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC10411905/" target="_blank" rel="noreferrer">研究：执行功能结论并不一致 ↗</a>
        </div>
      </section>

      <footer><div className="brand-mark small" aria-hidden="true">停</div><p>欲望可以存在，选择权也可以在你手里。</p></footer>

      {showFriction && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowFriction(false)}>
          <section className="friction-modal" role="dialog" aria-modal="true" aria-labelledby="friction-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="关闭" onClick={() => setShowFriction(false)}>×</button>
            <span className="section-index">最后一次清醒确认</span>
            <h2 id="friction-title">你想要的是色情，<br />还是“不再难受”5分钟？</h2>
            <p>如果是后者，色情没有解决它，只是让它晚一点回来。</p>
            <button className="primary-action" onClick={() => { setShowFriction(false); setTimerState("idle"); setSeconds(90); }}>再给自己 90 秒</button>
            <button className="secondary-action" onClick={() => setShowFriction(false)}>我知道代价，仍由我决定</button>
          </section>
        </div>
      )}
    </main>
  );
}
