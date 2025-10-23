import React from "react";

export const NavigatorCollapse: React.FC<{
    title?: string;
    initialCollapsed?: boolean;
    children: React.ReactNode; // your Navigator component
}> = ({ title = "Navigator", initialCollapsed, children }) => {
    const [collapsed, setCollapsed] = React.useState<boolean>(!!initialCollapsed);

    // Collapse automatically below 1024px width
    React.useEffect(() => {
        const mq = window.matchMedia("(max-width: 1024px)");
        const apply = (m: MediaQueryList | MediaQueryListEvent) => setCollapsed(!!m.matches);
        apply(mq);
        mq.addEventListener("change", apply);
        return () => mq.removeEventListener("change", apply);
    }, []);

    return (
        <div className="w-full">
            {collapsed ? (
                <button
                    onClick={() => setCollapsed(false)}
                    className="w-full text-left px-3 py-2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                    title="Show navigator"
                >
                    ▸ {title}
                </button>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                        <span className="text-sm font-medium text-slate-700">{title}</span>
                        <button
                            onClick={() => setCollapsed(true)}
                            className="text-slate-600 hover:text-slate-800"
                            title="Hide navigator"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="p-2">{children}</div>
                </div>
            )}
        </div>
    );
};
