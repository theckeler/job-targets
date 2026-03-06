"use client";

export default function Modal({
  footerActions,
  action,
  title,
  modalType = "center",
  children,
}: {
  footerActions: React.ReactNode;
  action: () => void;
  title: string;
  modalType?: "bottom" | "center";
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
        onClick={action}
      />

      <div
        className={`fixed z-50 bg-slate-900 w-full  rounded p-6 ${modalType === "bottom" ? "bottom-0 left-0 right-0" : "max-w-xl top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2"}`}
      >
        {modalType === "bottom" && (
          <div className="w-10 h-1 bg-[#334155] rounded mx-auto mb-5" />
        )}

        <h2 className="text-white/90 text-lg mb-6 truncate">{title}</h2>
        <div className="mb-1">{children}</div>
        {footerActions && (
          <div className="flex gap-2 mt-6">{footerActions}</div>
        )}
      </div>
    </>
  );
}
