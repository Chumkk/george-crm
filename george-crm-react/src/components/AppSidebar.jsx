import { Icon } from "./ui";
export function AppSidebar({ api, shell }) {
  const active =
    {
      board: "projects",
      detail: "projects",
      oppDetail: "opps",
      custDetail: "customers",
      draftEditor: "drafts",
    }[shell.kind] || shell.kind;
  return (
    <>
      <div className="v5-nav-top">
        <span>业务工作空间</span>
        <button
          aria-label={shell.mini ? "展开导航" : "收起导航"}
          title={shell.mini ? "展开导航" : "收起导航"}
          onClick={() => api.fold()}
        >
          <svg className="sky-icon" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
      </div>
      <nav className="v5-nav-links" aria-label="主导航">
        {shell.nav.map(([group, items]) => (
          <section key={group}>
            <div className="v5-nav-group">{group}</div>
            {items.map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => api.navigate(id)}
                className={active === id ? "on" : ""}
                aria-current={active === id ? "page" : undefined}
                title={label}
              >
                <Icon api={api} name={icon} />
                <span>{label}</span>
                {id === "todos" && shell.count > 0 && (
                  <small className="rx-menu-todo-count">{shell.count}</small>
                )}
              </button>
            ))}
          </section>
        ))}
      </nav>
      <div className="v5-nav-bottom">
        <img
          className="company-logo company-logo-light"
          src={shell.logo}
          alt="George 敬城国际"
        />
        <p>让理想空间成为日常</p>
      </div>
    </>
  );
}
