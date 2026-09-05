"use client";

import { useEffect } from "react";
import NewPRForm from "./NewPRForm";

const CHANCELLOR_NAME = "Atty. Shidik T. Abantas, MDM, LLM";
const CHANCELLOR_TITLE = "Chancellor";

export default function FixedApproverPRForm() {
  useEffect(() => {
    const applyFixedApprover = () => {
      const approvedInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Name of approving authority"]'
      );
      const designationInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Designation (e.g., Chancellor)"]'
      );

      if (!approvedInput || !designationInput) return;

      const approvedColumn = approvedInput.parentElement;
      if (!approvedColumn) return;

      approvedColumn.classList.add("fixed-approver-column");
      approvedInput.value = CHANCELLOR_NAME;
      designationInput.value = CHANCELLOR_TITLE;
      approvedInput.disabled = true;
      designationInput.disabled = true;
      approvedInput.setAttribute("aria-readonly", "true");
      designationInput.setAttribute("aria-readonly", "true");
    };

    applyFixedApprover();
    const observer = new MutationObserver(applyFixedApprover);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed-approver-pr-form">
      <style jsx global>{`
        .fixed-approver-column input,
        .fixed-approver-column label {
          display: none !important;
        }

        .fixed-approver-column::before {
          content: "Approved By";
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #44403c;
          margin-bottom: 0.5rem;
        }

        .fixed-approver-column::after {
          content: "Atty. Shidik T. Abantas, MDM, LLM\\AChancellor";
          white-space: pre-line;
          display: block;
          padding: 0.625rem 1rem;
          border: 1px solid #d6d3d1;
          border-radius: 0.5rem;
          background: #f5f5f4;
          color: #292524;
          font-size: 0.875rem;
          font-weight: 600;
          line-height: 1.5;
        }
      `}</style>
      <NewPRForm />
    </div>
  );
}
