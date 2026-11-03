import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EmptyState, PageHeading, Status } from "../../components/ui";
import "./customers.css";

export const optionValue = (item) =>
  String(
    typeof item === "object" ? (item.id ?? item.value ?? item.name) : item,
  );
export const optionLabel = (item) =>
  String(
    typeof item === "object" ? (item.name ?? item.label ?? item.id) : item,
  );
export const dateText = (value) =>
  value ? String(value).replace("T", " ").slice(0, 16) : "未安排";
const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const followupText = (value) =>
  typeof value === "object"
    ? value?.content || ""
    : /^\d{4}-\d{2}-\d{2}/.test(value || "")
      ? ""
      : value || "";
const followupAt = (value) =>
  typeof value === "object"
    ? value?.at
    : /^\d{4}-\d{2}-\d{2}/.test(value || "")
      ? value
      : "";
export function Field({ label, children, wide = false }) {
  return (
    <label className={`ch-field${wide ? " wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function CustomerModal({
  title,
  children,
  onClose,
  dirty = false,
  wide = false,
}) {
  const ref = useRef(null),
    closeRef = useRef(onClose),
    dirtyRef = useRef(dirty),
    titleId = useId();
  closeRef.current = onClose;
  dirtyRef.current = dirty;
  const close = () => {
    if (
      !dirtyRef.current ||
      window.confirm("有尚未保存的内容，确定放弃修改并关闭？")
    )
      closeRef.current();
  };
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("input, textarea, select, button")?.focus();
    const keydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (
          !dirtyRef.current ||
          window.confirm("有尚未保存的内容，确定放弃修改并关闭？")
        )
          closeRef.current();
      }
      if (e.key === "Tab") {
        const items = [
          ...(ref.current?.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ) || []),
        ];
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const beforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("keydown", keydown, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("beforeunload", beforeUnload);
      previous?.isConnected && previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className="ch-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={ref}
        className={`ch-modal${wide ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="rx-btn quiet"
            onClick={close}
            aria-label={`关闭${title}`}
          >
            关闭 ×
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}

export function TagChips({ ids = [], tags = [] }) {
  if (!ids.length)
    return (
      <div className="ch-tags ch-empty-tags">
        <span className="ch-muted">暂无标签</span>
      </div>
    );
  return (
    <div className="ch-tags">
      {ids.map((id) => {
        const tag = tags.find((t) => optionValue(t) === String(id));
        return (
          <span className="ch-tag" key={id}>
            {tag ? optionLabel(tag) : "未识别标签"}
          </span>
        );
      })}
    </div>
  );
}

export function TagPicker({
  tags = [],
  value = [],
  onChange,
  disabled = false,
}) {
  const groups = [...new Set(tags.map((t) => t.group || "自定义"))];
  return (
    <div className="ch-tag-picker">
      {!tags.length && (
        <p className="ch-muted">尚无标签，可先创建自定义标签。</p>
      )}
      {groups.map((group) => (
        <fieldset key={group}>
          <legend>{group}</legend>
          <div className="ch-tag-options">
            {tags
              .filter((t) => (t.group || "自定义") === group)
              .map((tag) => {
                const id = optionValue(tag),
                  checked = value.map(String).includes(id);
                return (
                  <label className={checked ? "selected" : ""} key={id}>
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={checked}
                      onChange={() =>
                        onChange(
                          checked
                            ? value.filter((v) => String(v) !== id)
                            : [...value, id],
                        )
                      }
                    />
                    {optionLabel(tag)}
                  </label>
                );
              })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

export function CreateTagForm({ api, onCreated, onDirty }) {
  const [name, setName] = useState(""),
    [group, setGroup] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    onDirty?.(Boolean(name || group));
  }, [name, group, onDirty]);
  return (
    <div className="ch-create-tag">
      <h3>创建自定义标签</h3>
      <div className="ch-inline-fields">
        <Field label="标签名称">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="例如：偏好自然材质"
          />
        </Field>
        <Field label="标签分组">
          <input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            maxLength={30}
            placeholder="例如：客户偏好"
          />
        </Field>
        <button
          type="button"
          className="rx-btn"
          onClick={() => {
            if (!name.trim()) return setError("请填写标签名称。");
            try {
              const result = api.customerAction("createTag", { name, group });
              if (!result?.ok)
                return setError(result?.error || "标签未保存，请重试。");
              setName("");
              setGroup("");
              setError("");
              onCreated?.(result.id);
            } catch {
              setError("标签未保存，请重试。");
            }
          }}
        >
          创建标签
        </button>
      </div>
      {error && (
        <p className="ch-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FollowupForm({ customer, api, onSaved, onClose }) {
  const [value, setValue] = useState({
    content: "",
    nextAction: customer.nextAction || "",
    nextAt: (customer.nextAt || "").slice(0, 10),
    projectId: "",
  });
  const initial = useRef(JSON.stringify(value)),
    [error, setError] = useState("");
  const change = (key) => (e) => setValue({ ...value, [key]: e.target.value });
  return (
    <CustomerModal
      title={`记录跟进 · ${customer.name}`}
      onClose={onClose}
      dirty={JSON.stringify(value) !== initial.current}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.content.trim()) return setError("请填写本次跟进内容。");
          try {
            const result = api.customerAction("addFollowup", {
              customerId: customer.id,
              ...value,
              source: "CRM",
            });
            if (!result?.ok)
              return setError(result?.error || "跟进记录未保存，请重试。");
            onSaved("跟进已保存");
          } catch {
            setError("跟进记录未保存，请重试。");
          }
        }}
      >
        <div className="ch-form-grid">
          <Field label="本次跟进内容 *" wide>
            <textarea
              rows={5}
              required
              value={value.content}
              onChange={change("content")}
              placeholder="记录客户反馈、已完成的沟通及待确认事项"
            />
          </Field>
          <Field label="关联项目">
            <select value={value.projectId} onChange={change("projectId")}>
              <option value="">客户层面的跟进</option>
              {(customer.projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="下次跟进日期">
            <input
              type="date"
              value={value.nextAt}
              onInput={change("nextAt")}
              onChange={change("nextAt")}
            />
          </Field>
          <Field label="下一步行动" wide>
            <input
              value={value.nextAction}
              onChange={change("nextAction")}
              placeholder="例如：确认尺寸并安排方案沟通"
            />
          </Field>
        </div>
        {error && (
          <p className="ch-error" role="alert">
            {error}
          </p>
        )}
        <footer className="ch-modal-actions">
          <button type="submit" className="rx-btn primary">
            保存跟进
          </button>
        </footer>
      </form>
    </CustomerModal>
  );
}

function ProfileForm({ customer, api, onSaved, onClose }) {
  const [value, setValue] = useState({
    priority: customer.priority || "常规",
    focus: Boolean(customer.focus),
    coordination: Boolean(customer.coordination),
    nextAction: customer.nextAction || "",
    nextAt: (customer.nextAt || "").slice(0, 10),
    notes: customer.notes || "",
  });
  const initial = useRef(JSON.stringify(value)),
    [error, setError] = useState("");
  const change = (key) => (e) =>
    setValue({
      ...value,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  const priorities = [...new Set(["重点", "常规", "培育", value.priority])];
  return (
    <CustomerModal
      title="编辑跟进画像"
      onClose={onClose}
      dirty={JSON.stringify(value) !== initial.current}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const result = api.customerAction("saveProfile", {
              customerId: customer.id,
              patch: value,
            });
            if (!result?.ok)
              return setError(result?.error || "修改未保存，请重试。");
            onSaved("客户画像已保存");
          } catch {
            setError("修改未保存，请重试。");
          }
        }}
      >
        <div className="ch-form-grid">
          <Field label="跟进优先级">
            <select value={value.priority} onChange={change("priority")}>
              {priorities.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="下次跟进日期">
            <input
              type="date"
              value={value.nextAt}
              onInput={change("nextAt")}
              onChange={change("nextAt")}
            />
          </Field>
          <div className="ch-checkboxes wide">
            <label>
              <input
                type="checkbox"
                checked={value.focus}
                onChange={change("focus")}
              />
              重点推进
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.coordination}
                onChange={change("coordination")}
              />
              需要协调
            </label>
          </div>
          <Field label="下一步行动" wide>
            <input value={value.nextAction} onChange={change("nextAction")} />
          </Field>
          <Field label="客户备注" wide>
            <textarea rows={4} value={value.notes} onChange={change("notes")} />
          </Field>
        </div>
        {error && (
          <p className="ch-error" role="alert">
            {error}
          </p>
        )}
        <footer className="ch-modal-actions">
          <button className="rx-btn primary" type="submit">
            保存画像
          </button>
        </footer>
      </form>
    </CustomerModal>
  );
}

function TagsForm({
  api,
  model,
  customerIds,
  initialTags = [],
  mode = "replace",
  onSaved,
  onClose,
}) {
  const [tagIds, setTagIds] = useState(initialTags),
    [error, setError] = useState(""),
    [tagDraftDirty, setTagDraftDirty] = useState(false),
    [revision, setRevision] = useState(0);
  const tags = revision ? api.customerHub().tags || [] : model.tags || [];
  return (
    <CustomerModal
      title={
        mode === "replace"
          ? "编辑客户标签"
          : `${mode === "add" ? "批量添加" : "批量移除"}标签 · ${customerIds.length} 位客户`
      }
      onClose={onClose}
      dirty={
        tagDraftDirty || JSON.stringify(tagIds) !== JSON.stringify(initialTags)
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (tagDraftDirty)
            return setError(
              "请先创建已填写的新标签，或清空新标签内容后再保存。",
            );
          try {
            const result = api.customerAction("saveTags", {
              customerIds,
              tagIds,
              mode,
            });
            if (!result?.ok)
              return setError(result?.error || "标签未保存，请重试。");
            onSaved("客户标签已保存");
          } catch {
            setError("标签未保存，请重试。");
          }
        }}
      >
        <TagPicker tags={tags} value={tagIds} onChange={setTagIds} />
        {mode !== "remove" && (
          <CreateTagForm
            api={api}
            onDirty={setTagDraftDirty}
            onCreated={(id) => {
              setRevision(revision + 1);
              if (id) setTagIds([...tagIds, id]);
            }}
          />
        )}
        {error && (
          <p className="ch-error" role="alert">
            {error}
          </p>
        )}
        <footer className="ch-modal-actions">
          <button type="submit" className="rx-btn primary">
            {mode === "remove" ? "移除所选标签" : "保存标签"}
          </button>
        </footer>
      </form>
    </CustomerModal>
  );
}

function ProjectCard({ project, api }) {
  const opportunities = project.opportunities || [];
  const counts = Array.isArray(project.stageCounts)
    ? project.stageCounts.map((item) => [
        item.stage || item.name || item.label,
        item.count,
      ])
    : Object.entries(project.stageCounts || {});
  return (
    <details className="ch-project" open>
      <summary>
        <span>
          <strong>{project.name}</strong>
          <small>
            {project.region || "未填区域"} · 项目负责人 {project.pm || "未分配"}
          </small>
        </span>
        <span className="ch-project-summary">
          <span className="ch-badge">{project.grade || "未评级"}</span>
          <Status value={project.status || "暂无商机"} />
          <span>{opportunities.length} 个商机</span>
        </span>
      </summary>
      <div className="ch-project-body">
        <div className="ch-project-tools">
          <div className="ch-stage-counts">
            <span>商机阶段分布</span>
            {counts.length ? (
              counts.map(([stage, count]) => (
                <span className="ch-tag" key={stage}>
                  {stage} <b>{count}</b>
                </span>
              ))
            ) : (
              <span className="ch-muted">暂无阶段记录</span>
            )}
          </div>
          <div className="ch-actions">
            <button
              className="rx-btn"
              onClick={() => api.navigate(`detail-${project.id}`)}
            >
              项目档案
            </button>
            <button
              className="rx-btn"
              onClick={() => api.navigate(`board-${project.id}`)}
            >
              项目报价总览
            </button>
          </div>
        </div>
        {opportunities.length ? (
          <div className="ch-opp-list">
            {opportunities.map((opp) => (
              <div className="ch-opp" key={opp.id}>
                <div>
                  <button
                    className="ch-name"
                    onClick={() => api.navigate(`opp-${opp.id}`)}
                  >
                    {opp.name || opp.category || "商机"}
                  </button>
                  <small>
                    {opp.category || "未指定品类"} · 方案经理{" "}
                    {opp.sm || "未分配"}
                    {opp.isAddon ? " · 增购" : ""}
                  </small>
                </div>
                <div className="ch-opp-state">
                  <Status value={opp.status || opp.stage} />
                  {opp.stage && opp.stage !== opp.status && (
                    <span>{opp.stage}</span>
                  )}
                  <span>{opp.orderCount || 0} 个订单</span>
                </div>
                <button
                  className="rx-btn"
                  onClick={() => api.navigate(`opp-${opp.id}`)}
                >
                  商机详情
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="ch-muted">此项目暂无关联商机。</p>
        )}
      </div>
    </details>
  );
}

function CustomerDetail({ customer, model, api, openModal, setNotice }) {
  const [tab, setTab] = useState("overview");
  const canManage = model.canManage !== false && customer.canManage !== false,
    projects = customer.projects || [],
    followups = customer.followups || [];
  const openConversation = () => {
    const result = api.openConversation(customer.id);
    if (result?.ok === false)
      setNotice(result.error || "暂时无法打开会话，请重试。");
  };
  return (
    <>
      <PageHeading
        title={customer.name}
        eyebrow="客户详情"
        description={`${customer.country || "国家待补充"} · ${customer.phone || "电话待补充"} · 负责人 ${customer.owner || "未分配"}`}
        actions={
          <>
            <button
              className="rx-btn"
              onClick={() => api.navigate("customers")}
            >
              客户列表
            </button>
            {canManage && (
              <button
                className="rx-btn"
                onClick={() =>
                  api.action("modal:editCustomer", { cust: customer.name })
                }
              >
                编辑资料
              </button>
            )}
            <button className="rx-btn" onClick={openConversation}>
              打开会话
            </button>
            <button
              className="rx-btn"
              onClick={() => {
                const result = api.customerHistory(customer.id);
                if (result?.ok === false)
                  setNotice(result.error || "暂时无法打开记录，请重试。");
              }}
            >
              归属与公海记录
            </button>
            {canManage && (
              <button
                className="rx-btn primary"
                onClick={() => openModal({ kind: "followup", customer })}
              >
                记录跟进
              </button>
            )}
          </>
        }
      />
      <div className="ch-tabs" role="tablist" aria-label="客户详情内容">
        {[
          ["overview", "概览"],
          ["projects", `项目与商机 (${projects.length})`],
          ["followups", `跟进记录 (${followups.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="ch-detail-content">
        {tab === "overview" && (
          <div className="ch-overview-grid">
            <section className="ch-section">
              <header>
                <h2>跟进画像</h2>
                {canManage && (
                  <button
                    className="rx-btn"
                    onClick={() => openModal({ kind: "profile", customer })}
                  >
                    编辑画像
                  </button>
                )}
              </header>
              <dl className="ch-facts">
                <div>
                  <dt>客户身份</dt>
                  <dd>{customer.identity || "未填写"}</dd>
                </div>
                <div>
                  <dt>线索来源</dt>
                  <dd>{customer.source || "未填写"}</dd>
                </div>
                <div>
                  <dt>跟进优先级</dt>
                  <dd>{customer.priority || "常规"}</dd>
                </div>
                <div>
                  <dt>推进关注</dt>
                  <dd>
                    {[
                      customer.focus && "重点推进",
                      customer.coordination && "待协调",
                    ]
                      .filter(Boolean)
                      .join("、") || "常规跟进"}
                  </dd>
                </div>
                <div>
                  <dt>下一步行动</dt>
                  <dd>{customer.nextAction || "未安排"}</dd>
                </div>
                <div>
                  <dt>下次跟进</dt>
                  <dd>{dateText(customer.nextAt)}</dd>
                </div>
                <div>
                  <dt>公海预警</dt>
                  <dd>{customer.poolStatus || "未记录"}</dd>
                </div>
                <div>
                  <dt>业务部门</dt>
                  <dd>
                    {customer.businessDepartment ||
                      customer.department ||
                      "未填写"}
                  </dd>
                </div>
                <div className="wide">
                  <dt>客户备注</dt>
                  <dd className="ch-prewrap">{customer.notes || "暂无备注"}</dd>
                </div>
              </dl>
            </section>
            <section className="ch-section">
              <header>
                <h2>客户标签</h2>
                {canManage && (
                  <button
                    className="rx-btn"
                    onClick={() =>
                      openModal({
                        kind: "tags",
                        customerIds: [customer.id],
                        initialTags: customer.tags || [],
                      })
                    }
                  >
                    编辑标签
                  </button>
                )}
              </header>
              <TagChips ids={customer.tags} tags={model.tags} />
              <div className="ch-overview-summary">
                <h3>关联业务</h3>
                <p>
                  {projects.length} 个项目 ·{" "}
                  {projects.reduce(
                    (sum, p) => sum + (p.opportunities?.length || 0),
                    0,
                  )}{" "}
                  个商机
                </p>
                <button className="rx-btn" onClick={() => setTab("projects")}>
                  查看项目与商机
                </button>
                <h3>最近跟进</h3>
                <p className="ch-prewrap">
                  {followupText(customer.lastFollowup) ||
                    followups[0]?.content ||
                    "尚无跟进记录"}
                </p>
                {(followupAt(customer.lastFollowup) || followups[0]?.at) && (
                  <small className="ch-muted">
                    {dateText(
                      followupAt(customer.lastFollowup) || followups[0]?.at,
                    )}
                  </small>
                )}
              </div>
            </section>
          </div>
        )}
        {tab === "projects" &&
          (projects.length ? (
            projects.map((project) => (
              <ProjectCard key={project.id} project={project} api={api} />
            ))
          ) : (
            <EmptyState
              title="暂无关联项目"
              description="客户关联项目后，可在这里查看该项目的商机与推进情况。"
            />
          ))}
        {tab === "followups" && (
          <section className="ch-section">
            <header>
              <h2>跟进记录</h2>
              {canManage && (
                <button
                  className="rx-btn primary"
                  onClick={() => openModal({ kind: "followup", customer })}
                >
                  记录跟进
                </button>
              )}
            </header>
            {followups.length ? (
              <ol className="ch-timeline">
                {[...followups]
                  .sort((a, b) => String(b.at).localeCompare(String(a.at)))
                  .map((f) => (
                    <li key={f.id}>
                      <div className="ch-timeline-meta">
                        <strong>{f.author || "跟进人未记录"}</strong>
                        <time>{dateText(f.at)}</time>
                        <span>{f.source || "CRM"}</span>
                        {f.projectId && (
                          <button
                            className="ch-name"
                            onClick={() =>
                              api.navigate(`detail-${f.projectId}`)
                            }
                          >
                            {projects.find(
                              (p) => String(p.id) === String(f.projectId),
                            )?.name || "关联项目"}
                          </button>
                        )}
                      </div>
                      <p className="ch-prewrap">{f.content}</p>
                      {(f.nextAction || f.nextAt) && (
                        <div className="ch-next-note">
                          下一步：{f.nextAction || "未填写行动"}
                          {f.nextAt && ` · ${dateText(f.nextAt)}`}
                        </div>
                      )}
                    </li>
                  ))}
              </ol>
            ) : (
              <EmptyState
                title="尚无跟进记录"
                description="记录客户反馈和下一步计划，让每次沟通持续衔接。"
              />
            )}
          </section>
        )}
      </div>
    </>
  );
}

const customerBasics = (customer) =>
  Object.fromEntries(
    [
      "name",
      "country",
      "phone",
      "identity",
      "source",
      "email",
      "wechat",
      "companyName",
      "companyAddress",
    ].map((key) => [key, customer[key] || ""]),
  );
const customerProfile = (customer) => ({
  priority: customer.priority || "常规",
  focus: Boolean(customer.focus),
  coordination: Boolean(customer.coordination),
  nextAction: customer.nextAction || "",
  nextAt: (customer.nextAt || "").slice(0, 10),
  notes: customer.notes || "",
});
const latestFollowup = (customer) =>
  [...(customer.followups || [])].sort((a, b) =>
    String(b.at).localeCompare(String(a.at)),
  )[0];

function CustomerProgress({ customer, onOpen }) {
  const projects = customer.projects || [],
    opportunities = projects.flatMap((p) => p.opportunities || []);
  const stages = Object.entries(
    projects.reduce((result, p) => {
      for (const [stage, count] of Object.entries(p.stageCounts || {}))
        result[stage] = (result[stage] || 0) + Number(count || 0);
      return result;
    }, {}),
  ).filter(([, count]) => count > 0);
  return (
    <div className="ch-business-summary">
      <button className="ch-name" onClick={onOpen}>
        {projects.length} 个项目 · {opportunities.length} 个商机
      </button>
      {projects.slice(0, 2).map((p) => (
        <button className="ch-project-snippet" key={p.id} onClick={onOpen}>
          <span title={p.name}>{p.name}</span>
          <b>{p.status || "未建立商机"}</b>
        </button>
      ))}
      {stages.length > 0 && (
        <small
          className="ch-stage-line"
          title={stages
            .map(([stage, count]) => `${stage} ${count}`)
            .join(" · ")}
        >
          {stages
            .slice(0, 3)
            .map(([stage, count]) => `${stage} ${count}`)
            .join(" · ")}
          {stages.length > 3 ? " …" : ""}
        </small>
      )}
      {projects.length > 2 && (
        <button className="ch-inline-link" onClick={onOpen}>
          查看全部 {projects.length} 个项目
        </button>
      )}
    </div>
  );
}

function CustomerDrawer({
  customer,
  model,
  api,
  initialTab = "overview",
  initialSection,
  onClose,
  onRefresh,
}) {
  const ref = useRef(null),
    titleId = useId(),
    tabId = useId(),
    dirtyRef = useRef(false),
    closeRef = useRef(onClose);
  const [tab, setTab] = useState(initialTab),
    [basics, setBasics] = useState(() => customerBasics(customer)),
    [profile, setProfile] = useState(() => customerProfile(customer)),
    [tagIds, setTagIds] = useState(customer.tags || []),
    [followup, setFollowup] = useState({ content: "", projectId: "" }),
    [tagDraftDirty, setTagDraftDirty] = useState(false),
    [feedback, setFeedback] = useState({});
  const basicsBase = useRef(customerBasics(customer)),
    profileBase = useRef(customerProfile(customer)),
    tagsBase = useRef(customer.tags || []);
  const canManage = model.canManage !== false && customer.canManage !== false;
  const basicsDirty =
      JSON.stringify(basics) !== JSON.stringify(basicsBase.current),
    profileDirty =
      JSON.stringify(profile) !== JSON.stringify(profileBase.current),
    tagsDirty = JSON.stringify(tagIds) !== JSON.stringify(tagsBase.current);
  const dirty =
    basicsDirty ||
    profileDirty ||
    tagsDirty ||
    tagDraftDirty ||
    Boolean(followup.content || followup.projectId);
  dirtyRef.current = dirty;
  closeRef.current = onClose;
  const changeBasic = (key) => (e) =>
    setBasics({ ...basics, [key]: e.target.value });
  const changeProfile = (key) => (e) =>
    setProfile({
      ...profile,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  const setResult = (section, message, ok = false) =>
    setFeedback((old) => ({ ...old, [section]: { message, ok } }));
  const requestClose = () => {
    if (
      !dirtyRef.current ||
      window.confirm("抽屉中有尚未保存的内容，确定放弃修改并关闭？")
    )
      closeRef.current();
  };
  const leave = (action) => {
    if (
      !dirtyRef.current ||
      window.confirm("抽屉中有尚未保存的内容，确定放弃修改并离开？")
    ) {
      closeRef.current();
      action();
    }
  };
  const submit = (type, payload, section, message, commit) => {
    try {
      const result = api.customerAction(type, payload);
      if (!result?.ok)
        return setResult(
          section,
          result?.error || "保存失败，已保留填写内容，请重试。",
        );
      commit?.();
      setResult(section, message, true);
      onRefresh();
    } catch {
      setResult(section, "保存失败，已保留填写内容，请重试。");
    }
  };
  const resultMessage = (section) =>
    feedback[section] && (
      <p
        className={feedback[section].ok ? "ch-save-result" : "ch-error"}
        role={feedback[section].ok ? "status" : "alert"}
      >
        {feedback[section].message}
      </p>
    );
  const freshBasics = JSON.stringify(customerBasics(customer)),
    freshProfile = JSON.stringify(customerProfile(customer)),
    freshTags = JSON.stringify(customer.tags || []);
  useEffect(() => {
    if (!basicsDirty) {
      const next = JSON.parse(freshBasics);
      basicsBase.current = next;
      setBasics(next);
    }
  }, [freshBasics]);
  useEffect(() => {
    if (!profileDirty) {
      const next = JSON.parse(freshProfile);
      profileBase.current = next;
      setProfile(next);
    }
  }, [freshProfile]);
  useEffect(() => {
    if (!tagsDirty) {
      const next = JSON.parse(freshTags);
      tagsBase.current = next;
      setTagIds(next);
    }
  }, [freshTags]);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("button:not([disabled]), input:not([disabled]), [tabindex='0']")?.focus();
    const keydown = (e) => {
      // Original customer forms and history remain usable above the drawer.
      if (document.querySelector(".mask.on, #v3Dialog")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (
          !dirtyRef.current ||
          window.confirm("抽屉中有尚未保存的内容，确定放弃修改并关闭？")
        )
          closeRef.current();
      }
      if (e.key === "Tab") {
        const items = [
          ...(ref.current?.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ) || []),
        ].filter((item) => item.getClientRects().length > 0);
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !ref.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !ref.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const beforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("keydown", keydown, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("keydown", keydown, true);
      window.removeEventListener("beforeunload", beforeUnload);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    if (tab === "edit" && initialSection)
      requestAnimationFrame(() =>
        ref.current
          ?.querySelector(`[data-drawer-section="${initialSection}"]`)
          ?.scrollIntoView({ block: "start" }),
      );
  }, [initialSection]);
  const tabs = [
    ["overview", "概览"],
    ["edit", "资料编辑"],
    ["followups", "跟进"],
    ["projects", "项目商机"],
  ];
  const followups = [...(customer.followups || [])].sort((a, b) =>
      String(b.at).localeCompare(String(a.at)),
    ),
    latest = followups[0];
  const navigationApi = {
    ...api,
    navigate: (id) => leave(() => api.navigate(id)),
  };
  return createPortal(
    <div
      className="ch-drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <aside
        ref={ref}
        className="ch-customer-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="ch-drawer-heading">
          <div>
            <span className="ch-drawer-kicker">客户工作区</span>
            <h2 id={titleId}>{customer.name}</h2>
            <p>
              {customer.country || "国家待补充"} ·{" "}
              {customer.phone || "电话待补充"}
            </p>
          </div>
        </header>
        <div className="ch-drawer-toolbar">
          <button
            className="rx-btn"
            onClick={() => leave(() => api.navigate(`cust-${customer.id}`))}
          >
            打开完整详情
          </button>
          <button
            className="rx-btn"
            onClick={() => leave(() => api.openConversation(customer.id))}
          >
            打开会话
          </button>
          <button
            className="rx-btn"
            onClick={() => api.customerHistory(customer.id)}
          >
            归属与公海记录
          </button>
          <span className={dirty ? "ch-unsaved" : "ch-muted"}>
            {dirty ? "有未保存内容" : "更改将按分区保存"}
          </span>
        </div>
        <div
          className="ch-tabs ch-drawer-tabs"
          role="tablist"
          aria-label="客户抽屉内容"
        >
          {tabs.map(([key, label], index) => (
            <button
              key={key}
              id={`${tabId}-${key}-tab`}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`${tabId}-${key}-panel`}
              tabIndex={tab === key ? 0 : -1}
              onClick={() => setTab(key)}
              onKeyDown={(e) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                  return;
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (index +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setTab(tabs[next][0]);
                ref.current?.querySelectorAll('[role="tab"]')[next]?.focus();
              }}
            >
              {label}
              {key === "edit" &&
                (basicsDirty || profileDirty || tagsDirty || tagDraftDirty) && (
                  <span className="ch-draft-dot" aria-label="有未保存修改" />
                )}
              {key === "followups" && followup.content && (
                <span className="ch-draft-dot" aria-label="有未保存跟进" />
              )}
            </button>
          ))}
        </div>
        <div className="ch-drawer-content">
          <section
            className="ch-drawer-panel"
            hidden={tab !== "overview"}
            role="tabpanel"
            id={`${tabId}-overview-panel`}
            aria-labelledby={`${tabId}-overview-tab`}
          >
            <div className="ch-drawer-focus">
              <div>
                <span>下一步行动</span>
                <strong>{customer.nextAction || "尚未安排下一步行动"}</strong>
                <p>
                  {customer.nextAt
                    ? `下次跟进 ${dateText(customer.nextAt)}`
                    : "尚未安排跟进日期"}
                </p>
              </div>
              {canManage && (
                <button
                  className="rx-btn primary"
                  onClick={() => setTab("followups")}
                >
                  记录跟进
                </button>
              )}
            </div>
            <section className="ch-drawer-section">
              <header>
                <h3>客户画像</h3>
                {canManage && (
                  <button
                    className="ch-inline-link"
                    onClick={() => setTab("edit")}
                  >
                    编辑资料与标签
                  </button>
                )}
              </header>
              <dl className="ch-facts">
                <div>
                  <dt>客户身份</dt>
                  <dd>{customer.identity || "未填写"}</dd>
                </div>
                <div>
                  <dt>来源</dt>
                  <dd>{customer.source || "未填写"}</dd>
                </div>
                <div>
                  <dt>负责人</dt>
                  <dd>{customer.owner || "未分配"}</dd>
                </div>
                <div>
                  <dt>跟进优先级</dt>
                  <dd>{customer.priority || "常规"}</dd>
                </div>
                <div>
                  <dt>推进关注</dt>
                  <dd>
                    {[
                      customer.focus && "重点推进",
                      customer.coordination && "待协调",
                    ]
                      .filter(Boolean)
                      .join("、") || "常规跟进"}
                  </dd>
                </div>
                <div>
                  <dt>公海预警</dt>
                  <dd>{customer.poolStatus || "未记录"}</dd>
                </div>
                <div className="wide">
                  <dt>客户标签</dt>
                  <dd>
                    <TagChips ids={customer.tags} tags={model.tags} />
                  </dd>
                </div>
                {customer.notes && (
                  <div className="wide">
                    <dt>备注</dt>
                    <dd className="ch-prewrap">{customer.notes}</dd>
                  </div>
                )}
              </dl>
            </section>
            <section className="ch-drawer-section">
              <header>
                <h3>项目与商机进度</h3>
                <button
                  className="ch-inline-link"
                  onClick={() => setTab("projects")}
                >
                  查看全部
                </button>
              </header>
              <CustomerProgress
                customer={customer}
                onOpen={() => setTab("projects")}
              />
            </section>
            <section className="ch-drawer-section">
              <header>
                <h3>最近跟进</h3>
                <button
                  className="ch-inline-link"
                  onClick={() => setTab("followups")}
                >
                  查看记录
                </button>
              </header>
              <p className="ch-prewrap">
                {latest?.content ||
                  followupText(customer.lastFollowup) ||
                  "尚无跟进记录"}
              </p>
              {(latest?.at || followupAt(customer.lastFollowup)) && (
                <p className="ch-muted">
                  {dateText(latest?.at || followupAt(customer.lastFollowup))}
                  {latest?.author ? ` · ${latest.author}` : ""}
                </p>
              )}
            </section>
          </section>
          <section
            className="ch-drawer-panel"
            hidden={tab !== "edit"}
            role="tabpanel"
            id={`${tabId}-edit-panel`}
            aria-labelledby={`${tabId}-edit-tab`}
          >
            <form
              className="ch-drawer-section"
              data-drawer-section="basics"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "saveCustomerBasics",
                  { customerId: customer.id, patch: basics },
                  "basics",
                  "基础资料已保存",
                  () => {
                    basicsBase.current = { ...basics };
                  },
                );
              }}
            >
              <header>
                <h3>基础资料</h3>
                {canManage && (
                  <button
                    type="button"
                    className="ch-inline-link"
                    onClick={() => {
                      if (basicsDirty)
                        return setResult(
                          "basics",
                          "请先保存本区基础资料，再打开完整资料表单。其他分区的输入会保留。",
                        );
                      api.action("modal:editCustomer", { cust: customer.name });
                    }}
                  >
                    打开完整资料表单
                  </button>
                )}
              </header>
              <div className="ch-form-grid">
                {[
                  ["name", "客户名称 *"],
                  ["country", "国家或地区 *"],
                  ["phone", "手机号码 *"],
                  ["identity", "客户身份"],
                  ["source", "客户来源"],
                  ["email", "Email"],
                  ["wechat", "微信"],
                  ["companyName", "公司名称"],
                  ["companyAddress", "公司地址"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    wide={key === "companyAddress"}
                  >
                    <input
                      value={basics[key]}
                      onChange={changeBasic(key)}
                      disabled={!canManage}
                      required={["name", "country", "phone"].includes(key)}
                      type={
                        key === "email"
                          ? "email"
                          : key === "phone"
                            ? "tel"
                            : "text"
                      }
                    />
                  </Field>
                ))}
              </div>
              <dl className="ch-readonly-facts">
                <div>
                  <dt>负责人</dt>
                  <dd>{customer.owner || "未分配"}</dd>
                </div>
                <div>
                  <dt>客户部门</dt>
                  <dd>{customer.department || "未填写"}</dd>
                </div>
                <div>
                  <dt>业务部门</dt>
                  <dd>{customer.businessDepartment || "未填写"}</dd>
                </div>
                <div>
                  <dt>运营人员</dt>
                  <dd>{customer.operator || "未填写"}</dd>
                </div>
              </dl>
              {resultMessage("basics")}
              {canManage && (
                <footer className="ch-section-actions">
                  <button
                    className="rx-btn primary"
                    type="submit"
                    disabled={!basicsDirty}
                  >
                    保存基础资料
                  </button>
                </footer>
              )}
            </form>
            <form
              className="ch-drawer-section"
              data-drawer-section="profile"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "saveProfile",
                  { customerId: customer.id, patch: profile },
                  "profile",
                  "跟进画像已保存",
                  () => {
                    profileBase.current = { ...profile };
                  },
                );
              }}
            >
              <header>
                <h3>跟进画像</h3>
              </header>
              <div className="ch-form-grid">
                <Field label="跟进优先级">
                  <select
                    value={profile.priority}
                    onChange={changeProfile("priority")}
                    disabled={!canManage}
                  >
                    {["重点", "常规", "培育"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
                <Field label="下次跟进日期">
                  <input
                    type="date"
                    value={profile.nextAt}
                    onChange={changeProfile("nextAt")}
                    disabled={!canManage}
                  />
                </Field>
                <div className="ch-checkboxes wide">
                  <label>
                    <input
                      type="checkbox"
                      checked={profile.focus}
                      onChange={changeProfile("focus")}
                      disabled={!canManage}
                    />
                    重点推进
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={profile.coordination}
                      onChange={changeProfile("coordination")}
                      disabled={!canManage}
                    />
                    需要协调
                  </label>
                </div>
                <Field label="下一步行动" wide>
                  <input
                    value={profile.nextAction}
                    onChange={changeProfile("nextAction")}
                    disabled={!canManage}
                  />
                </Field>
                <Field label="客户备注" wide>
                  <textarea
                    rows={3}
                    value={profile.notes}
                    onChange={changeProfile("notes")}
                    disabled={!canManage}
                  />
                </Field>
              </div>
              {resultMessage("profile")}
              {canManage && (
                <footer className="ch-section-actions">
                  <button
                    className="rx-btn primary"
                    type="submit"
                    disabled={!profileDirty}
                  >
                    保存跟进画像
                  </button>
                </footer>
              )}
            </form>
            <form
              className="ch-drawer-section"
              data-drawer-section="tags"
              onSubmit={(e) => {
                e.preventDefault();
                if (tagDraftDirty)
                  return setResult(
                    "tags",
                    "请先创建已填写的新标签，或清空新标签内容后再保存。",
                  );
                submit(
                  "saveTags",
                  { customerIds: [customer.id], tagIds, mode: "replace" },
                  "tags",
                  "客户标签已保存",
                  () => {
                    tagsBase.current = [...tagIds];
                  },
                );
              }}
            >
              <header>
                <h3>客户标签</h3>
              </header>
              <TagPicker
                tags={model.tags || []}
                value={tagIds}
                onChange={setTagIds}
                disabled={!canManage}
              />
              {canManage && (
                <CreateTagForm
                  api={api}
                  onDirty={setTagDraftDirty}
                  onCreated={(id) => {
                    if (id) setTagIds((old) => [...new Set([...old, id])]);
                    onRefresh();
                  }}
                />
              )}
              {resultMessage("tags")}
              {canManage && (
                <footer className="ch-section-actions">
                  <button
                    className="rx-btn primary"
                    type="submit"
                    disabled={!tagsDirty && !tagDraftDirty}
                  >
                    保存客户标签
                  </button>
                </footer>
              )}
            </form>
          </section>
          <section
            className="ch-drawer-panel"
            hidden={tab !== "followups"}
            role="tabpanel"
            id={`${tabId}-followups-panel`}
            aria-labelledby={`${tabId}-followups-tab`}
          >
            {canManage && (
              <form
                className="ch-drawer-section"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!followup.content.trim())
                    return setResult("followup", "请填写本次跟进内容。");
                  submit(
                    "addFollowup",
                    {
                      customerId: customer.id,
                      ...followup,
                      nextAction: profile.nextAction,
                      nextAt: profile.nextAt,
                      source: "CRM",
                    },
                    "followup",
                    "本次跟进与下一步计划已保存",
                    () => {
                      setFollowup({ content: "", projectId: "" });
                      profileBase.current = {
                        ...profileBase.current,
                        nextAction: profile.nextAction,
                        nextAt: profile.nextAt,
                      };
                    },
                  );
                }}
              >
                <header>
                  <h3>记录本次跟进</h3>
                </header>
                <div className="ch-form-grid">
                  <Field label="跟进内容 *" wide>
                    <textarea
                      rows={5}
                      required
                      value={followup.content}
                      onChange={(e) =>
                        setFollowup({ ...followup, content: e.target.value })
                      }
                      placeholder="客户反馈、沟通结果及待确认事项"
                    />
                  </Field>
                  <Field label="关联项目">
                    <select
                      value={followup.projectId}
                      onChange={(e) =>
                        setFollowup({ ...followup, projectId: e.target.value })
                      }
                    >
                      <option value="">客户层面的跟进</option>
                      {(customer.projects || []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="下次跟进日期">
                    <input
                      type="date"
                      value={profile.nextAt}
                      onChange={changeProfile("nextAt")}
                    />
                  </Field>
                  <Field label="下一步行动" wide>
                    <input
                      value={profile.nextAction}
                      onChange={changeProfile("nextAction")}
                      placeholder="例如：确认尺寸并安排方案沟通"
                    />
                  </Field>
                </div>
                {resultMessage("followup")}
                <footer className="ch-section-actions">
                  <button className="rx-btn primary" type="submit">
                    保存本次跟进
                  </button>
                </footer>
              </form>
            )}
            <section className="ch-drawer-section">
              <header>
                <h3>
                  跟进记录{" "}
                  <span className="ch-muted">{followups.length} 条</span>
                </h3>
              </header>
              {followups.length ? (
                <ol className="ch-timeline">
                  {followups.map((f) => (
                    <li key={f.id}>
                      <div className="ch-timeline-meta">
                        <strong>{f.author || "未记录跟进人"}</strong>
                        <time>{dateText(f.at)}</time>
                        <span>{f.source || "CRM"}</span>
                      </div>
                      <p className="ch-prewrap">{f.content}</p>
                      {f.projectId && (
                        <button
                          className="ch-inline-link"
                          onClick={() =>
                            leave(() => api.navigate(`detail-${f.projectId}`))
                          }
                        >
                          {customer.projects?.find(
                            (p) => String(p.id) === String(f.projectId),
                          )?.name || "查看关联项目"}
                        </button>
                      )}
                      {(f.nextAction || f.nextAt) && (
                        <div className="ch-next-note">
                          下一步：{f.nextAction || "未填写行动"}
                          {f.nextAt && ` · ${dateText(f.nextAt)}`}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="ch-muted">尚无跟进记录。</p>
              )}
            </section>
          </section>
          <section
            className="ch-drawer-panel"
            hidden={tab !== "projects"}
            role="tabpanel"
            id={`${tabId}-projects-panel`}
            aria-labelledby={`${tabId}-projects-tab`}
          >
            {customer.projects?.length ? (
              customer.projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  api={navigationApi}
                />
              ))
            ) : (
              <EmptyState
                title="暂无关联项目"
                description="关联项目后，将在这里显示全部商机及当前推进情况。"
              />
            )}
          </section>
        </div>
        <footer className="ch-drawer-footer">
          <span>
            {dirty
              ? "切换页签会保留当前输入，请按分区保存。"
              : "列表筛选与滚动位置会保留。"}
          </span>
          <button className="rx-btn" onClick={requestClose}>
            关闭抽屉
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export function CustomerCenter({ api, surface }) {
  const model = api.customerHub(),
    customers = model.customers || [],
    tags = model.tags || [];
  const [query, setQuery] = useState(""),
    [view, setView] = useState("all"),
    [owner, setOwner] = useState(""),
    [tag, setTag] = useState(""),
    [pool, setPool] = useState(""),
    [selected, setSelected] = useState([]),
    [drawer, setDrawer] = useState(null),
    [expandedColumns, setExpandedColumns] = useState(false),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(""),
    [tagDraftDirty, setTagDraftDirty] = useState(false),
    [, redraw] = useState(0);
  const canManage = model.canManage !== false,
    today = dayKey();
  const matchingView = (c, key) =>
    key === "all" ||
    (key === "today" && c.nextAt?.slice(0, 10) === today) ||
    (key === "overdue" && c.nextAt && c.nextAt.slice(0, 10) < today) ||
    (key === "focus" && (c.focus || c.priority === "重点")) ||
    (key === "coordination" && c.coordination) ||
    (key === "unscheduled" && !c.nextAt);
  const views = [
    ["all", "全部客户"],
    ["today", "今日待跟进"],
    ["overdue", "已超期"],
    ["focus", "重点推进"],
    ["coordination", "待协调"],
    ["unscheduled", "未安排跟进"],
  ];
  const rows = customers.filter(
    (c) =>
      matchingView(c, view) &&
      (!owner || String(c.ownerId || c.owner) === owner) &&
      (!tag || (c.tags || []).map(String).includes(tag)) &&
      (!pool || c.poolStatus === pool) &&
      (!query.trim() ||
        [
          c.name,
          c.phone,
          c.country,
          c.identity,
          c.owner,
          ...(c.projects || []).map((p) => p.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  const editableRows = rows.filter((c) => canManage && c.canManage !== false);
  const selectedVisible = editableRows.filter((c) => selected.includes(c.id));
  const customerId =
    surface?.kind === "custDetail"
      ? String(surface.id).replace(/^cust-/, "")
      : null;
  const detail =
    customerId === null
      ? null
      : customers.find((c) => String(c.id) === customerId);
  const drawerCustomer =
    drawer && customers.find((c) => String(c.id) === String(drawer.id));
  const openDrawer = (customer, tab = "overview", section) =>
    setDrawer({ id: customer.id, tab, section });
  const saved = (message) => {
    setModal(null);
    setNotice(message);
    redraw((n) => n + 1);
  };
  const openConversation = (id) => {
    const result = api.openConversation(id);
    if (result?.ok === false)
      setNotice(result.error || "暂时无法打开会话，请重试。");
  };
  return (
    <div
      className="rx-page rx-customers"
      data-react-feature={surface?.kind || "customers"}
    >
      {notice && (
        <div className="ch-notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            className="rx-btn quiet"
            onClick={() => setNotice("")}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      )}
      {customerId !== null ? (
        detail ? (
          <CustomerDetail
            key={customerId}
            customer={detail}
            model={model}
            api={api}
            openModal={setModal}
            setNotice={setNotice}
          />
        ) : (
          <EmptyState
            title="客户暂时不可见"
            description="该客户可能已删除，或当前账号没有查看权限。"
            action={
              <button
                className="rx-btn"
                onClick={() => api.navigate("customers")}
              >
                返回客户列表
              </button>
            }
          />
        )
      ) : (
        <>
          <PageHeading
            title="客户管理"
            description="从客户出发，安排跟进、管理标签并衔接项目与商机。"
            actions={
              <>
                <button
                  className="rx-btn"
                  onClick={() => api.navigate("leads")}
                >
                  线索管理
                </button>
                {canManage && (
                  <button
                    className="rx-btn primary"
                    onClick={() => api.action("createCustomer")}
                  >
                    ＋ 创建客户
                  </button>
                )}
              </>
            }
          />
          <div className="ch-quickviews" aria-label="客户快捷视图">
            {views.map(([key, label]) => (
              <button
                key={key}
                aria-pressed={view === key}
                className={view === key ? "on" : ""}
                onClick={() => {
                  setView(key);
                  setSelected([]);
                }}
              >
                <span>{label}</span>
                <strong>
                  {customers.filter((c) => matchingView(c, key)).length}
                </strong>
              </button>
            ))}
          </div>
          <section className="ch-section ch-list-section">
            <div className="ch-filters">
              <Field label="搜索客户">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected([]);
                  }}
                  placeholder="客户、电话、国家或项目"
                />
              </Field>
              <Field label="负责人">
                <select
                  value={owner}
                  onChange={(e) => {
                    setOwner(e.target.value);
                    setSelected([]);
                  }}
                >
                  <option value="">全部负责人</option>
                  {(model.owners || []).map((o) => (
                    <option key={optionValue(o)} value={optionValue(o)}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="客户标签">
                <select
                  value={tag}
                  onChange={(e) => {
                    setTag(e.target.value);
                    setSelected([]);
                  }}
                >
                  <option value="">全部标签</option>
                  {tags.map((t) => (
                    <option key={optionValue(t)} value={optionValue(t)}>
                      {optionLabel(t)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="公海预警">
                <select
                  value={pool}
                  onChange={(e) => {
                    setPool(e.target.value);
                    setSelected([]);
                  }}
                >
                  <option value="">全部预警状态</option>
                  {[
                    ...new Set(
                      customers.map((c) => c.poolStatus).filter(Boolean),
                    ),
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </Field>
              <button
                className="rx-btn quiet"
                onClick={() => {
                  setQuery("");
                  setOwner("");
                  setTag("");
                  setPool("");
                  setView("all");
                  setSelected([]);
                }}
              >
                重置筛选
              </button>
              <span className="ch-filter-total">{rows.length} 位客户</span>
            </div>
            <div className="ch-list-display">
              <span>点击客户查看右侧抽屉，直接编辑资料、标签或记录跟进。</span>
              <div
                className="ch-column-switch"
                role="group"
                aria-label="客户列表显示列"
              >
                <button
                  type="button"
                  aria-pressed={!expandedColumns}
                  onClick={() => setExpandedColumns(false)}
                >
                  常用列
                </button>
                <button
                  type="button"
                  aria-pressed={expandedColumns}
                  onClick={() => setExpandedColumns(true)}
                >
                  更多资料
                </button>
              </div>
            </div>
            {canManage && (
              <div className="ch-bulk">
                <span>已选择 {selectedVisible.length} 位客户</span>
                <button
                  className="rx-btn"
                  disabled={!selectedVisible.length}
                  onClick={() =>
                    setModal({
                      kind: "tags",
                      mode: "add",
                      customerIds: selectedVisible.map((c) => c.id),
                    })
                  }
                >
                  批量添加标签
                </button>
                <button
                  className="rx-btn"
                  disabled={!selectedVisible.length}
                  onClick={() =>
                    setModal({
                      kind: "tags",
                      mode: "remove",
                      customerIds: selectedVisible.map((c) => c.id),
                    })
                  }
                >
                  批量移除标签
                </button>
                <button
                  className="rx-btn quiet"
                  onClick={() => {
                    setTagDraftDirty(false);
                    setModal({ kind: "tagCreate" });
                  }}
                >
                  创建标签
                </button>
              </div>
            )}
            <p className="ch-scroll-hint">
              可横向滚动查看全部资料，操作按钮固定在右侧。
            </p>
            <div
              className="ch-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="客户列表，可横向滚动查看全部资料"
            >
              <table
                className={`ch-table ch-customer-table${expandedColumns ? " ch-table-expanded" : ""}`}
              >
                <thead>
                  <tr>
                    {canManage && (
                      <th className="ch-check-cell">
                        <input
                          type="checkbox"
                          aria-label="选择当前筛选下全部客户"
                          checked={
                            editableRows.length > 0 &&
                            selectedVisible.length === editableRows.length
                          }
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? editableRows.map((c) => c.id)
                                : [],
                            )
                          }
                        />
                      </th>
                    )}
                    {[
                      "客户",
                      "身份 / 来源 / 标签",
                      "项目与商机进度",
                      "下一步与日期",
                      "最近跟进",
                      "负责人",
                      ...(expandedColumns ? ["归属与运营", "联系与公司"] : []),
                      "操作",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      {canManage && (
                        <td className="ch-check-cell">
                          <input
                            type="checkbox"
                            aria-label={`选择客户 ${c.name}`}
                            disabled={c.canManage === false}
                            checked={selected.includes(c.id)}
                            onChange={(e) =>
                              setSelected(
                                e.target.checked
                                  ? [...selected, c.id]
                                  : selected.filter((id) => id !== c.id),
                              )
                            }
                          />
                        </td>
                      )}
                      <td>
                        <button
                          className="ch-name"
                          onClick={() => openDrawer(c)}
                        >
                          {c.name}
                        </button>
                        <small>{c.country || "国家待补充"}</small>
                        <small>{c.phone || "电话待补充"}</small>
                        {c.poolStatus && c.poolStatus !== "正常" && (
                          <span className="ch-badge amber">{c.poolStatus}</span>
                        )}
                        {c.focus && <span className="ch-badge">重点推进</span>}
                        {c.coordination && (
                          <span className="ch-badge amber">待协调</span>
                        )}
                      </td>
                      <td className="ch-identity-cell">
                        <span className="ch-identity-label">
                          {c.identity || "身份未填写"}
                        </span>
                        <small
                          className="ch-customer-source"
                          title={c.source || ""}
                        >
                          来源：{c.source || "未填写"}
                        </small>
                        <TagChips ids={c.tags} tags={tags} />
                        {canManage && c.canManage !== false && (
                          <button
                            className="ch-inline-link"
                            onClick={() => openDrawer(c, "edit", "tags")}
                          >
                            编辑标签
                          </button>
                        )}
                      </td>
                      <td>
                        <CustomerProgress
                          customer={c}
                          onOpen={() => openDrawer(c, "projects")}
                        />
                      </td>
                      <td>
                        <span className="ch-clamp">
                          {c.nextAction || "未填写下一步"}
                        </span>
                        <small
                          className={
                            c.nextAt && c.nextAt.slice(0, 10) < today
                              ? "ch-overdue"
                              : ""
                          }
                        >
                          {dateText(c.nextAt)}
                        </small>
                      </td>
                      <td>
                        <span className="ch-clamp">
                          {latestFollowup(c)?.content ||
                            followupText(c.lastFollowup) ||
                            "尚无跟进"}
                        </span>
                        {(latestFollowup(c)?.at ||
                          followupAt(c.lastFollowup)) && (
                          <small>
                            {dateText(
                              latestFollowup(c)?.at ||
                                followupAt(c.lastFollowup),
                            )}
                          </small>
                        )}
                        {latestFollowup(c)?.author && (
                          <small>{latestFollowup(c).author}</small>
                        )}
                      </td>
                      <td>
                        {c.owner || "未分配"}
                        <small>{c.priority || "常规"}</small>
                      </td>
                      {expandedColumns && (
                        <>
                          <td>
                            <span>
                              {c.businessDepartment ||
                                c.department ||
                                "部门未填写"}
                            </span>
                            <small>运营：{c.operator || "未填写"}</small>
                            <small>
                              建档：
                              {c.createdAt ? dateText(c.createdAt) : "未记录"}
                            </small>
                          </td>
                          <td>
                            <span>{c.companyName || "公司未填写"}</span>
                            <small>{c.email || "Email 未填写"}</small>
                            <small>微信：{c.wechat || "未填写"}</small>
                          </td>
                        </>
                      )}
                      <td>
                        <div className="ch-row-actions">
                          {canManage && c.canManage !== false && (
                            <button
                              className="rx-btn primary"
                              onClick={() => openDrawer(c, "followups")}
                            >
                              记录跟进
                            </button>
                          )}
                          <button
                            className="rx-btn"
                            onClick={() => openDrawer(c)}
                          >
                            客户详情
                          </button>
                          {canManage && c.canManage !== false && (
                            <button
                              className="rx-btn"
                              onClick={() => openDrawer(c, "edit", "basics")}
                            >
                              编辑资料
                            </button>
                          )}

                          <button
                            className="rx-btn"
                            onClick={() => openConversation(c.id)}
                          >
                            打开会话
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <EmptyState
                title="没有匹配的客户"
                description="调整快捷视图或筛选条件后再试。"
              />
            )}
          </section>
        </>
      )}
      {drawerCustomer && (
        <CustomerDrawer
          key={drawerCustomer.id}
          customer={drawerCustomer}
          model={model}
          api={api}
          initialTab={drawer.tab}
          initialSection={drawer.section}
          onClose={() => setDrawer(null)}
          onRefresh={() => redraw((n) => n + 1)}
        />
      )}
      {modal?.kind === "followup" && (
        <FollowupForm
          customer={modal.customer}
          api={api}
          onSaved={saved}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "profile" && (
        <ProfileForm
          customer={modal.customer}
          api={api}
          onSaved={saved}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "tags" && (
        <TagsForm
          {...modal}
          api={api}
          model={model}
          onSaved={saved}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "tagCreate" && (
        <CustomerModal
          title="标签管理"
          onClose={() => setModal(null)}
          dirty={tagDraftDirty}
        >
          <CreateTagForm
            api={api}
            onDirty={setTagDraftDirty}
            onCreated={() => {
              redraw((n) => n + 1);
              setNotice("标签已创建");
            }}
          />
          <TagPicker tags={tags} value={[]} onChange={() => {}} disabled />
        </CustomerModal>
      )}
    </div>
  );
}
