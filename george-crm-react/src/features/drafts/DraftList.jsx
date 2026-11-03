import { useEffect, useState } from "react";
import { PageHeading, Status, EmptyState, Icon } from "../../components/ui";
export function DraftList({ api }) {
  const model = api.drafts(),
    [query, setQuery] = useState(model.query);
  useEffect(() => setQuery(model.query), [model.query]);
  return (
    <div className="rx-page rx-drafts" data-react-feature="drafts">
      <PageHeading
        title="草稿报价"
        description="管理报价版本，跟进客户确认与商机关联。"
        actions={
          <>
            <button className="rx-btn" onClick={() => api.navigate("mall")}>
              <Icon api={api} name="grid" />
              商城选品
            </button>
            <button
              className="rx-btn primary"
              onClick={() => api.draftAction("new")}
            >
              ＋ 新建草稿
            </button>
          </>
        }
      />
      <div className="rx-metrics">
        {[
          ["全部", "全部草稿", "all", "保存的方案记录"],
          ["已提交", "待客户确认", "submitted", "已提交的品类报价"],
          ["已确认", "客户已确认", "confirmed", "可绑定商机"],
          ["已绑定", "已绑定商机", "bound", "已衔接销售订单"],
        ].map(([filter, label, key, copy]) => (
          <button
            key={key}
            className={`rx-metric ${model.filter === filter ? "on" : ""}`}
            onClick={() => api.draftFilter(filter, model.query)}
            aria-pressed={model.filter === filter}
          >
            <span>{label}</span>
            <strong>{model.counts[key]}</strong>
            <small>{copy}</small>
          </button>
        ))}
      </div>
      <section className="rx-panel">
        <form
          className="rx-toolbar rx-draft-tools"
          onSubmit={(e) => {
            e.preventDefault();
            api.draftFilter(model.filter, query);
          }}
        >
          <label className="rx-search">
            <Icon api={api} name="search" />
            <input
              aria-label="搜索草稿"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索草稿名称、编号、负责人或标签"
            />
          </label>
          <button className="rx-btn" type="submit">
            查询
          </button>
          <select
            className="rx-select"
            aria-label="草稿状态"
            value={model.filter}
            onChange={(e) => api.draftFilter(e.target.value, query)}
          >
            {["全部", "已提交", "已确认", "已绑定"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <button
            className="rx-btn quiet"
            type="button"
            onClick={() => api.draftFilter("全部", "")}
          >
            重置
          </button>
          <span>{model.rows.length} 份草稿</span>
        </form>
        <div className="rx-table-scroll">
          <table className="rx-table">
            <thead>
              <tr>
                {[
                  "草稿 / 项目",
                  "品类 / 方案经理",
                  "报价金额",
                  "处理状态",
                  "最近更新",
                  "操作",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.rows.map((row) => (
                <tr key={row.code}>
                  <td>
                    <button
                      className="rx-text-strong"
                      onClick={() => api.draftAction("detail", row.code)}
                    >
                      {row.name}
                    </button>
                    <small>
                      {row.number || row.code} · {row.project}
                    </small>
                    <div className="rx-draft-tags">
                      {row.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    {row.revision > 0 && (
                      <span className="rx-version">V{row.revision}</span>
                    )}
                  </td>
                  <td>
                    <strong>{row.categories.join("、") || row.template}</strong>
                    <small>{row.sm}</small>
                    <small>创建人 · {row.creator}</small>
                  </td>
                  <td className="rx-money">{row.amount}</td>
                  <td>
                    <Status value={row.status} />
                    {row.changed && (
                      <small className="rx-warning">有未提交修改</small>
                    )}
                  </td>
                  <td>
                    {row.updated}
                    <small>
                      {row.source} · {row.template}
                    </small>
                  </td>
                  <td>
                    <div className="rx-table-actions">
                      <button
                        onClick={() => api.draftAction("detail", row.code)}
                      >
                        详情
                      </button>
                      <button
                        disabled={!row.canEdit}
                        title={row.editDisabledReason || undefined}
                        onClick={() => api.draftAction("edit", row.code)}
                      >
                        编辑
                      </button>
                      <button onClick={() => api.draftAction("copy", row.code)}>
                        复制
                      </button>
                      <button onClick={() => api.draftAction("tags", row.code)}>
                        标签
                      </button>
                      <button
                        disabled={!row.canBind}
                        onClick={() => api.draftAction("bind", row.code)}
                      >
                        {row.bound ? "重新绑定" : "绑定商机"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!model.rows.length && <EmptyState />}
        </div>
      </section>
    </div>
  );
}
