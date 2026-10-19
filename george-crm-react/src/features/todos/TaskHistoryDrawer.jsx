import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Status } from "../../components/ui";
function stamp(value) {
  if (!value) return "未记录";
  const raw = /^\d{4}-\d\d-\d\d \d\d:\d\d/.test(value) ? value.replace(" ", "T") + "+08:00" : value;
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ") : "未记录";
}
export function TaskHistoryDrawer({ api, id, onClose }) {
  const root = useRef(null);
  const data = api.todoHistory(id);
  useEffect(() => {
    const previous = document.activeElement;
    root.current?.querySelector("button")?.focus();
    const key = event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== "Tab") return;
      const focusable = [...root.current.querySelectorAll('button,a[href],[tabindex="0"]')];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("keydown", key, true); if (previous?.isConnected) previous.focus(); };
  }, [id, onClose]);
  return createPortal(<div className="rx-history-mask" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="rx-history-drawer" ref={root} role="dialog" aria-modal="true" aria-labelledby="task-history-title">
      <header><div><h2 id="task-history-title">处理记录</h2><p>{data?.title || "待办"} · {id}</p></div><button className="rx-btn quiet" aria-label="关闭处理记录" onClick={onClose}>×</button></header>
      <div className="rx-history-body" tabIndex={0}>
        {!data ? <p role="alert">当前无权查看此待办，或记录已不可用。</p> : <>
          <div className="rx-history-subject"><strong>{data.subject}</strong><Status value={data.status} /><p>{[data.project, data.order].filter(Boolean).join(" · ")}</p><p>待办人 · {data.owner || "未记录"}　发起人 · {data.initiator || "未记录"}</p></div>
          <div className="rx-history-metrics">{[["总历时", data.summary.total], ["首次办理", data.summary.firstResponse], ["催办次数", data.summary.reminders], ["转派次数", data.summary.transfers]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          <p className="rx-history-partial">{data.summary.startedAt ? `计时起点 · ${stamp(data.summary.startedAt)}（${data.summary.basis}）` : "计时起点未记录"}{data.summary.firstHandledAt && `；${data.partial ? "首个已记录办理" : "首次办理"} · ${stamp(data.summary.firstHandledAt)}`}。{data.partial ? "历史操作可能不完整，缺失记录不补造。" : "完成后总历时固定；查看和催办不计为首次办理。"}</p>
          <h3>处理时间线 <small>{data.events.length} 条记录 · 北京时间</small></h3>
          <ol className="rx-history-timeline">{data.events.map(event => <li key={event.id} className={`event-${event.kind}`}>
            <div className="rx-history-event-title"><strong>{event.title}</strong><time>{stamp(event.at)}</time></div>
            <p>操作人 · {event.actor || "未记录"}<span className="rx-history-source">{event.source}{event.legacy ? " · 历史记录" : ""}</span></p>
            {(event.fromOwner || event.toOwner) && <p>{event.kind === "transferred" ? `转派：${event.fromOwner || "未记录"} → ${event.toOwner || "未记录"}` : `交给：${event.toOwner || "未记录"}`}</p>}
            {(event.fromStatus || event.toStatus) && <p>状态：{[event.fromStatus, event.toStatus].filter(Boolean).join(" → ")}</p>}
            {event.detail && <p>{event.detail}</p>}{event.reason && <p className="rx-history-reason">原因 / 结果：{event.reason}</p>}
            {event.changes?.length > 0 && <details className="rx-history-changes"><summary>查看修改内容</summary>{event.changes.map((change, index) => <p key={index}><strong>{change.label}</strong><br/>{change.before} → {change.after}</p>)}</details>}
          </li>)}</ol>
          {!data.events.length && <p className="rx-history-partial">暂无可核实的处理记录。</p>}
          <h3>负责人分段耗时</h3>
          {data.segments.length ? <div className="rx-history-segments">{data.segments.map((segment, index) => <div key={index}><strong>{segment.owner || "未记录"}<small>{segment.kind}{segment.active ? " · 进行中" : ""}</small></strong><span>{stamp(segment.start)}<br/>→ {segment.end ? stamp(segment.end) : "现在"}</span><b>{segment.duration}</b></div>)}</div> : <p className="rx-history-partial">尚无完整的负责人处理时段记录。</p>}
          {data.responses.length > 0 && <><h3>催办接收人的响应</h3><div className="rx-history-responses">{data.responses.map(response => <p key={response.reminder}><span>催办 · {stamp(response.at)}{response.respondedAt && <small>实际办理 · {stamp(response.respondedAt)}</small>}</span><strong>{response.duration}</strong></p>)}</div></>}
        </>}
      </div><footer><button className="rx-btn secondary" onClick={onClose}>关闭</button></footer>
    </section>
  </div>, document.body);
}
