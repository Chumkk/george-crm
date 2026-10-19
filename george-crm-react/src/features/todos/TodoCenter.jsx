import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  PageHeading,
  Status,
  EmptyState,
  FragmentHtml,
  Icon,
} from "../../components/ui";
import { TASK_GROUPS, taskLabel, taskSubtitle, metricFilter, splitActions, taskRejectionReason, isCurrentTask } from "./model";
import "./taskFollowup.css";
function TaskAction({ api, action, appearance = "secondary" }) {
  if (!action) return null;
  if (action.html) return <FragmentHtml html={action.html} />;
  return (
    <button
      data-guide-action={action.act || undefined}
      className={`rx-btn rx-task-action ${appearance === "primary" ? "primary" : appearance === "link" ? "quiet" : "secondary"}${/^驳回/.test(action.t || "") ? " reject" : ""}`}
      disabled={!!action.disabled}
      title={action.title || undefined}
      onClick={() => api.todoAction(action)}
    >
      {action.t}
    </button>
  );
}
function TaskRow({ task, api }) {
  const isDesignDelivery = ["设计待办", "设计确认待办"].includes(task.type);
  const subtitle = taskSubtitle(task);
  const actions = splitActions(task.actions.filter((action) => action.act !== "viewDealFlow"));
  const rejectionReason = taskRejectionReason(task);
  const isView = (action) =>
    !action.primary && (action.act === "viewDealFlow" || /^(查看|详情|报价总览|项目报价总览|流程轨迹)/.test(action.t || ""));
  const mainAction = actions.main && !isView(actions.main) ? actions.main : null;
  const remaining = [actions.main, ...actions.others, ...actions.flow].filter(
    (action) => action && action !== mainAction,
  );
  const secondary = remaining.filter((action) => !isView(action));
  const views = remaining.filter(isView);
  // Keep editing in a consistent position before return/end actions.
  secondary.sort((a, b) => Number(b.act === "v81EditTodo") - Number(a.act === "v81EditTodo"));
  return (
    <article className="rx-task-row" data-todo-id={task.id} data-project-id={task.project || ""} data-opp-id={task.opp || ""} data-quote-code={task.draft || task.drafts?.[0] || ""} data-task-type={task.type}>
      <div className={`rx-task-icon ${task.status === "已处理" ? "done" : ""}`}>
        <Icon
          api={api}
          name={
            task.type.includes("报价")
              ? "file"
              : task.type.includes("设计")
                ? "plan"
                : "brief"
          }
        />
      </div>
      <div className="rx-task-copy">
        <div className="rx-task-title">
          <strong>{task.typeLabel}</strong>
          {task.businessInfo && <>
            {!isDesignDelivery && <span className="rx-task-tag">{task.businessInfo.label}</span>}
            {task.businessInfo.scope && <span className="rx-task-tag addon">{task.businessInfo.scope}</span>}
            {task.businessInfo.quoteStatus && <span className={`rx-task-tag ${task.businessInfo.quoteStatus === '已确认' ? 'confirmed' : 'quoted'}`} title={task.businessInfo.confirmedAt ? `客户确认时间：${task.businessInfo.confirmedAt}` : undefined}>{task.businessInfo.quoteStatus}</span>}
          </>}
          <Status value={task.status} />
          {task.followup?.deadline?.overdue && (
            <span className="rx-task-overdue">{task.followup.deadline.overdueLabel}</span>
          )}
        </div>
        {((subtitle.subject && subtitle.subject !== task.typeLabel) || subtitle.code) && (
          <p className="rx-task-subject">
            <span>{subtitle.subject}</span>
            {subtitle.code && <span className="rx-task-reference">{subtitle.code}</span>}
          </p>
        )}
        <div className="rx-task-meta">
          {subtitle.showCustomer && <span>{task.customer}</span>}
          {task.customerMeta ? (
            <FragmentHtml html={task.customerMeta} />
          ) : subtitle.showProjectMeta && <span>{subtitle.projectCode}</span>}
        </div>
        <div className="rx-task-arrival">{task.arrival} 到达</div>
        {task.followup?.deadline && (
          <div className={`rx-task-deadline ${task.followup.deadline.overdue ? "overdue" : ""}`}>
            {task.followup.deadline.label}
          </div>
        )}
      </div>
      <div className="rx-task-owner">
        <strong>{task.owner}</strong>
        {task.type === "设计确认待办" && task.coordination?.mode !== "self" && (task.coordination?.person || task.coordination?.gdsPerson || task.coordination?.mode === "designer") && <span>协调员 · {task.coordination.person || task.coordination.gdsPerson || "GDS 安排"}</span>}
        <span>发起人 · {task.meta.initiator || task.initiator || "—"}</span>
        <small>{task.stayLabel}</small>
      </div>
      <div className="rx-task-actions" role="group" aria-label="待办操作">
        {mainAction && (
          <div className="rx-task-main-action">
            <TaskAction
              api={api}
              action={mainAction}
              appearance={
                !/^(驳回|结束)/.test(mainAction.t || "") &&
                ((task.status === "待处理" && task.canOperate) ||
                  (task.status === "已驳回" && mainAction.act === "v81EditTodo"))
                  ? "primary"
                  : "secondary"
              }
            />
          </div>
        )}
        {secondary.length > 0 && (
          <div className="rx-task-secondary-actions">
            {secondary.map((action, i) => (
              <TaskAction key={`action-${i}`} api={api} action={action} />
            ))}
          </div>
        )}
        {views.length > 0 && (
          <div className={`rx-task-view-actions ${mainAction || secondary.length ? "with-operations" : ""}`}>
            {views.map((action, i) => (
              <TaskAction key={`view-${i}`} api={api} action={action} appearance="link" />
            ))}
          </div>
        )}
        {task.followup?.reminder?.visible && (
          <small className="rx-task-reminder-info">
            <span>{task.followup.reminder.lastLabel}</span>
            <span>{task.followup.reminder.nextLabel}</span>
          </small>
        )}
        {task.followup?.reminderHint && (
          <small className="rx-task-reminder-info">{task.followup.reminderHint}</small>
        )}
      </div>
      {task.status === "已驳回" && (
        <div className="rx-task-rejection">
          <strong>驳回原因</strong>
          <span>{rejectionReason || "此记录未保存驳回原因"}</span>
        </div>
      )}
    </article>
  );
}
export function TodoCenter({ api }) {
  const snapshot = api.todos();
  const model = { ...snapshot, rows: snapshot.rows.filter(isCurrentTask) };
  const [query, setQuery] = useState(model.query);
  const categoryNav = useRef(null);
  useEffect(() => setQuery(model.query), [model.query]);
  useLayoutEffect(() => {
    const container = categoryNav.current;
    const selected = container?.querySelector("button.on");
    if (!selected) return;
    const frame = container.getBoundingClientRect();
    const item = selected.getBoundingClientRect();
    // Only scroll the category panel, preserving the task list's reading position.
    if (container.scrollHeight > container.clientHeight) {
      if (item.bottom > frame.bottom - 12) container.scrollTop += item.bottom - frame.bottom + 12;
      else if (item.top < frame.top + 12) container.scrollTop -= frame.top + 12 - item.top;
    }
    if (container.scrollWidth > container.clientWidth) {
      if (item.right > frame.right - 8) container.scrollLeft += item.right - frame.right + 8;
      else if (item.left < frame.left + 8) container.scrollLeft -= frame.left + 8 - item.left;
    }
  }, [model.filter]);
  const nav = (type) => (
    <button
      key={type}
      data-task-type={type}
      className={model.filter === type ? "on" : ""}
      onClick={() => api.todoUpdate({ filter: type })}
    >
      <Icon
        api={api}
        name={
          type === "全部" ? "grid" : type.includes("设计") ? "plan" : "brief"
        }
      />
      <span>{type === "全部" ? "全部待办" : taskLabel(type)}</span>
      <small>{model.counts[type] || 0}</small>
    </button>
  );
  return (
    <div className="rx-page rx-todos" data-react-feature="todos">
      <PageHeading
        title="待办中心"
        description="让每一次交接，都有清晰的下一步。"
        actions={
          model.manager && model.relation === "all" && (
            <select
              className="rx-select"
              aria-label="查看本人或下属的工作"
              value={model.view}
              onChange={(e) => api.todoScope(e.target.value)}
            >
              <option value="team">
                {model.admin ? "全部人员" : "我和下属"}
              </option>
              {model.owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner === model.owner ? "我的业务" : api.name(owner)}
                </option>
              ))}
            </select>
          )
        }
      />
      {model.context && (
        <div className="rx-context">
          <div>
            <strong>
              来自{model.context.source || "业务流程"} · {model.context.label}
            </strong>
            <span>
              {model.context.scope} · 已定位 {model.context.count} 项待办
            </span>
          </div>
          <button className="rx-link" onClick={() => api.todoClearContext()}>
            查看全部待办 →
          </button>
        </div>
      )}
      <div className="rx-metrics">
        {[
          ["pending", "待处理待办", "有序跟进每一个业务环节", "clock"],
          ["today", "今日到达", "今日新增的待处理事项", "calendar"],
          ["done", "已处理待办", "查看已完成的处理记录", "check"],
          ["rejected", "已驳回待办", "回看原因，及时重新跟进", "rotate"],
        ].map(([key, label, copy, icon]) => {
          const f = metricFilter(key),
            active = model.status === f.status && model.quick === f.quick;
          return (
            <button
              key={key}
              className={`rx-metric ${active ? "on" : ""}`}
              aria-pressed={active}
              onClick={() => api.todoUpdate(f)}
            >
              <span>{label}</span>
              <strong>{model.metrics[key]}</strong>
              <small>{copy}</small>
              <Icon api={api} name={icon} />
            </button>
          );
        })}
      </div>
      <div className="rx-todo-layout">
        <aside ref={categoryNav} className="rx-task-nav" aria-label="待办任务分类" tabIndex={0}>
          <div className="rx-nav-label">任务分类</div>
          {nav("全部")}
          {TASK_GROUPS.map(([group, types]) => (
            <section key={group}>
              <div className="rx-nav-label">{group}</div>
              {types.map(nav)}
            </section>
          ))}
        </aside>
        <div className="rx-task-main">
          <form
            className="rx-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              api.todoUpdate({ query: query.trim() });
            }}
          >
            <label className="rx-search">
              <Icon api={api} name="search" />
              <input
                aria-label="搜索待办"
                placeholder="搜索事项、客户、项目号或商机号"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="清空搜索"
                  onClick={() => {
                    setQuery("");
                    api.todoUpdate({ query: "" });
                  }}
                >
                  ×
                </button>
              )}
            </label>
            <button className="rx-btn" type="submit">
              查询
            </button>
            <select
              className="rx-select"
              aria-label="待办关系筛选"
              value={model.relation}
              onChange={(e) => api.todoRelation(e.target.value)}
            >
              {[
                ["all", "全部"],
                ["responsible", "我负责"],
                ["initiated", "我发起"],
              ].map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select
              className="rx-select"
              aria-label="待办状态"
              value={model.status}
              onChange={(e) =>
                api.todoUpdate({ status: e.target.value, quick: "" })
              }
            >
              {["全部", "待处理", "已处理", "已驳回"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="rx-select"
              aria-label="待办排序"
              value={model.sort}
              onChange={(e) => api.todoUpdate({ sort: e.target.value })}
            >
              <option value="recent">最新到达</option>
              <option value="oldest">停留最久</option>
            </select>
            <select
              className="rx-select"
              aria-label="按停留时间筛选"
              value={model.stay}
              onChange={(e) => api.todoUpdate({ stay: e.target.value })}
            >
              {[
                ["all", "全部停留时间"],
                ["3", "停留 ≥ 3 天"],
                ["7", "停留 ≥ 7 天"],
                ["14", "停留 ≥ 14 天"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              className="rx-btn quiet"
              type="button"
              onClick={() => api.todoReset()}
            >
              重置
            </button>
          </form>
          <section className="rx-panel">
            <header className="rx-panel-heading">
              <h2>
                {model.filter === "全部" ? "全部待办" : taskLabel(model.filter)}{" "}
                <span>
                  / {model.quick === "today" ? "今日到达" : model.status}
                </span>
              </h2>
              <span>{model.rows.length} 项</span>
            </header>
            {model.rows.map((task) => (
              <TaskRow key={task.id} task={task} api={api} />
            ))}
            {!model.rows.length && (
              <EmptyState
                title={model.filter === "设计确认待办" ? "当前没有待处理的设计确认" : "当前没有待办事项"}
                description={model.filter === "设计确认待办" ? "GDS 回传设计图纸后生成 PM 设计确认待办，PM 或指定协调员逐张确认，全部确认后点击同步项目信息。也可清除筛选查看已有记录。" : "换一个分类，或清除筛选条件。"}
                action={
                  <button className="rx-btn" onClick={() => api.todoReset()}>
                    清除筛选
                  </button>
                }
              />
            )}
            <footer className="rx-panel-footer">
              共 {model.rows.length} 项 ·{" "}
              {model.sort === "oldest" ? "按停留时间排序" : "按到达时间排序"}
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
