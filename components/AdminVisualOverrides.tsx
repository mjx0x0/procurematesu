"use client";

export default function AdminVisualOverrides() {
  return (
    <style>{`
      .admin-shell .admin-dashboard-page .admin-refresh-btn::after,
      .admin-shell .admin-dashboard-page nav button[title="Logout"]::after,
      .admin-shell .admin-dashboard-page nav b::after {
        content: none !important;
      }

      .admin-shell .admin-dashboard-page nav b {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-style: normal !important;
        font-size: 1rem !important;
        font-weight: 700 !important;
        letter-spacing: -0.018em !important;
      }

      .admin-shell .admin-dashboard-page .admin-refresh-btn {
        min-width: 116px !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .admin-shell .admin-dashboard-page .admin-refresh-btn span {
        display: inline !important;
        visibility: visible !important;
      }

      .admin-shell .admin-dashboard-page nav button[title="Logout"] span {
        display: inline !important;
        visibility: visible !important;
      }

      .admin-shell .admin-dashboard-page table .rfq-generate-btn {
        min-width: 122px !important;
        min-height: 36px !important;
        padding: 0.55rem 0.8rem !important;
        background: linear-gradient(135deg, #7c1d2e, #5a1420) !important;
        color: #fff !important;
        border: 1px solid #7c1d2e !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        letter-spacing: 0.01em !important;
      }

      .admin-shell .admin-dashboard-page table .rfq-generate-btn:hover {
        background: linear-gradient(135deg, #5a1420, #4d0c0d) !important;
      }
    `}</style>
  );
}
