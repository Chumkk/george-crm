import { useLayoutEffect, useRef } from "react";
import { PageHeading, FragmentHtml, Icon } from "../../components/ui";
import { isCurrentNotification } from "../todos/model";
import roleNotifications from "./roles.json";
function NotificationCard({ message, api }) {
  return (
    <section className="v73-message">
      <div className="v72-chat-time">{message.time}</div>
      <div className="v72-chat-message">
        <div className="v72-crm-avatar">G</div>
        <div className="v72-bubble">
          <div className="v72-sender">敬城 CRM</div>
          <article className="v72-message-card">
            <h2>{message.card.title}</h2>
            <div className="v73-description">
              <FragmentHtml html={message.card.description} />
            </div>
            {message.card.btntxt && <button
              className="v72-card-action"
              onClick={() => api.openNotification(message.id)}
            >
              {message.card.btntxt}
              <span>›</span>
            </button>}
          </article>
          <div className="v73-demo-context">
            {message.sample ? "样例" : "本地业务演示"} · 接收人：
            {message.recipient}
          </div>
        </div>
      </div>
    </section>
  );
}
export function NotificationCenter({ api }) {
  const snapshot = api.notifications(),
    model = { ...snapshot, messages: snapshot.messages.filter(isCurrentNotification) },
    body = useRef(null),
    previous = useRef(0);
  useLayoutEffect(() => {
    if (body.current && model.messages.length !== previous.current) {
      body.current.scrollTop = body.current.scrollHeight;
      previous.current = model.messages.length;
    }
  }, [model.messages.length]);
  const latest = model.messages.at(-1);
  const roles = [...new Set(model.scenarios.map((scenario) => scenario.role))];
  const selectedRole = model.scenarios.find(
    (scenario) => String(scenario.id) === String(model.scenario),
  )?.role;
  return (
    <div
      className="rx-page rx-notifications v72-page"
      data-react-feature="notifications"
    >
      <PageHeading
        title="企业微信通知"
        description="各类业务通知进入同一个应用会话，点击卡片查看对应事项。"
        actions={
          <span className="rx-demo-pill">
            <i />
            本地模拟 · 不发送真实消息
          </span>
        }
      />
      <details className="mm-notification-guide">
        <summary>各角色接收哪些通知</summary>
        <div className="mm-notification-table"><table>
          <thead><tr><th>角色</th><th>接收通知</th><th>点击后的去向</th></tr></thead>
          <tbody>{roleNotifications.map(row => <tr key={row.role}><th scope="row">{row.role}</th><td>{row.events}</td><td>{row.entry}</td></tr>)}</tbody>
        </table></div>
      </details>
      <div className="rx-notification-tools">
        <label>
          演示场景
          <select
            className="rx-select"
            aria-label="选择通知演示场景"
            value={model.scenario}
            onChange={(e) => api.setScenario(e.target.value)}
          >
            {roles.map((role) => (
              <optgroup label={`接收角色：${role}`} key={role}>
                {model.scenarios
                  .filter((scenario) => scenario.role === role)
                  .map((scenario) => (
                    <option value={scenario.id} key={scenario.id}>
                      {scenario.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="rx-scenario-role" role="status">
          接收角色 <strong>{selectedRole}</strong>
        </div>
        <button className="rx-btn primary" onClick={() => api.simulate()}>
          模拟收到通知
        </button>
        <span>集中展示各接收人的样例，正式使用时只接收发给自己的通知。</span>
      </div>
      <section className="v72-window" aria-label="企业微信通知窗口">
        <aside className="v72-app-rail">
          <div className="v72-user-avatar">G</div>
          <div className="v72-rail-icon active">
            <Icon api={api} name="file" />
          </div>
          <div className="v72-rail-icon">
            <Icon api={api} name="users" />
          </div>
          <div className="v72-rail-icon">
            <Icon api={api} name="grid" />
          </div>
          <span>企微</span>
        </aside>
        <aside className="v72-conversations">
          <div className="v72-inbox-title">
            <strong>消息</strong>
          </div>
          <div className="v72-conversation on">
            <div className="v72-crm-avatar">G</div>
            <div>
              <header>
                <strong>敬城 CRM</strong>
                <small>企业应用</small>
              </header>
              <b>{latest?.card?.title || latest?.title || "业务通知"}</b>
            </div>
          </div>
        </aside>
        <main className="v72-chat">
          <header className="v72-chat-head">
            <div>
              <strong>敬城 CRM</strong>
              <span>应用通知</span>
            </div>
            <span className="v72-app-tag">企业应用</span>
          </header>
          <div
            className="v72-chat-body"
            ref={body}
            tabIndex={0}
            aria-label="通知消息记录"
          >
            {model.messages.map((m) => (
              <NotificationCard key={m.id} message={m} api={api} />
            ))}
            {!model.messages.length && <div className="rx-empty">暂无通知</div>}
          </div>
          <footer className="v72-chat-footer">
            卡片显示发送时的状态，点击后以业务页面当前结果为准。
            {!model.storageOk && (
              <b role="alert">通知记录未能保存，请检查浏览器存储空间。</b>
            )}
          </footer>
        </main>
      </section>
    </div>
  );
}
