import { useState } from "react";
import { Icon, PageHeading } from "../../components/ui";
import documentUpdates from "./document-updates.json";

function UpdatedAt({ id }) {
  return <small className="rx-prd-updated">更新时间：{documentUpdates[id]}（北京时间）</small>;
}

// Keep stable document URLs so later publications update the same library entry.
const documents = [
  {
    id: "space-quote",
    title: "空间报价 PRD",
    description:
      "涵盖待办中心、项目档案、项目报价总览、客户线上报价总览及企业微信通知。",
    tags: ["CRM", "PIMS", "空间报价"],
    url: "./space-quote-prd.html",
    pdf: "./space-quote-prd.pdf",
  },
];

export function FlowComparison() {
  return <section className="rx-prd-reader" data-react-feature="flowComparison">
    <header className="rx-prd-reader-bar">
      <div><h1>旧流程图</h1><UpdatedAt id="old-workflow" /></div>
      <a className="rx-btn" href="./workflow-comparison.html" target="_blank" rel="noopener noreferrer">独立窗口阅读 ↗</a>
    </header>
    <iframe src="./workflow-comparison.html?embedded=1" title="旧流程图" />
  </section>;
}

export function NewWorkflow() {
  return <section className="rx-prd-reader" data-react-feature="newWorkflow">
    <header className="rx-prd-reader-bar">
      <div><h1>新流程图</h1><UpdatedAt id="new-workflow" /></div>
      <a className="rx-btn" href="./new-workflow.html" target="_blank" rel="noopener noreferrer">独立窗口阅读 ↗</a>
    </header>
    <iframe src="./new-workflow.html?embedded=1" title="新流程图" />
  </section>;
}

export function PrdLibrary({ api }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = documents.find((document) => document.id === selectedId);

  if (selected) {
    return (
      <section className="rx-prd-reader" data-react-feature="prd">
        <header className="rx-prd-reader-bar">
          <div className="rx-prd-reader-title">
            <button
              className="rx-btn quiet"
              onClick={() => setSelectedId(null)}
            >
              ← 返回 PRD 列表
            </button>
            <div><h1>{selected.title}</h1><UpdatedAt id={selected.id} /></div>
          </div>
          <a
            className="rx-btn"
            href={selected.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            独立窗口阅读 ↗
          </a>
        </header>
        <iframe src={selected.url} title={selected.title} />
      </section>
    );
  }

  return (
    <div className="rx-page rx-prd-library" data-react-feature="prd">
      <PageHeading
        title="PRD"
        description="集中查阅产品需求文档、业务规则与流程图。"
      />
      <section className="rx-prd-collection" aria-labelledby="prd-list-title">
        <header>
          <h2 id="prd-list-title">产品需求文档</h2>
          <span>{documents.length + 2} 份文档</span>
        </header>
        {documents.map((document) => (
          <article className="rx-prd-card" key={document.id}>
            <div className="rx-prd-doc-icon">
              <Icon api={api} name="file" />
            </div>
            <div className="rx-prd-card-content">
              <h3>{document.title}</h3>
              <p>{document.description}</p>
              <UpdatedAt id={document.id} />
              <div className="rx-prd-tags">
                {document.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="rx-prd-card-actions">
              <button
                className="rx-btn primary"
                onClick={() => setSelectedId(document.id)}
              >
                阅读 PRD →
              </button>
              <a
                className="rx-btn"
                href={document.pdf}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF 版本 ↗
              </a>
            </div>
          </article>
        ))}
        <article className="rx-prd-card">
          <div className="rx-prd-doc-icon"><Icon api={api} name="file" /></div>
          <div className="rx-prd-card-content"><h3>旧流程图</h3><p>按系统和人员角色查看原有产品采购、设计服务及 ERP 收款备货流程。</p><UpdatedAt id="old-workflow" /></div>
          <div className="rx-prd-card-actions"><button className="rx-btn primary" onClick={() => api.navigate("flowComparison")}>查看旧流程图 →</button></div>
        </article>
        <article className="rx-prd-card">
          <div className="rx-prd-doc-icon"><Icon api={api} name="file" /></div>
          <div className="rx-prd-card-content"><h3>新流程图</h3><p>按系统和人员角色串联设计、商机、报价、客户确认与 ERP 流转，标明各待办的处理动作。</p><UpdatedAt id="new-workflow" /></div>
          <div className="rx-prd-card-actions"><button className="rx-btn primary" onClick={() => api.navigate("newWorkflow")}>查看新流程图 →</button></div>
        </article>
        <footer>文档持续更新，刷新即可查看最新发布内容。</footer>
      </section>
    </div>
  );
}
