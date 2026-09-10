export type TransparencyProject = {
  year: number;
  title: string;
  reference?: string;
  category: "Infrastructure" | "Goods & Equipment" | "Services" | "ICT" | "Research & Laboratory" | "Agriculture & Development" | "Other";
};

// Publicly listed procurement projects sourced from MSU-General Santos' official
// Bidding Documents page. These entries are intentionally presented as public
// procurement listings; a bidding-document listing alone does not establish
// that a project was awarded or completed.
export const TRANSPARENCY_PROJECTS: TransparencyProject[] = [
  { year: 2026, title: "Design and Build of 4-Storey MSU-GS Academic Complex Building", reference: "ACB-001-114-2026", category: "Infrastructure" },
  { year: 2026, title: "Purchase and Production of the 2024 and 2025 DARANGEN (yearbook)", reference: "UYB-002-272-26", category: "Other" },
  { year: 2026, title: "Procurement of Provision of Security Services", reference: "PSS-003-099-26", category: "Services" },
  { year: 2026, title: "Design and Build of MSU-GS Academic Facility for Peace, Culture and Arts", reference: "PCA-004-759-2026", category: "Infrastructure" },
  { year: 2026, title: "Construction of IIAIS Academic Building", reference: "IAB-006-2026", category: "Infrastructure" },
  { year: 2026, title: "Construction of Junior High School Building 2", reference: "JRHS2-005-2026", category: "Infrastructure" },
  { year: 2026, title: "Procurement of Google Workspace Education Plus", reference: "GWS-007-993-26", category: "ICT" },

  { year: 2025, title: "Purchase and Production of the 2023 DARANGEN (yearbook)", reference: "UYB-001-1671-25", category: "Other" },
  { year: 2025, title: "Procurement of Agricultural Supplies and Equipment - Maguindanao for OPAPRU MNLF Transformational Program (Re-bid)", reference: "AGRI-MAGUINDANAO-OPAPRU-002-2405-25", category: "Agriculture & Development" },
  { year: 2025, title: "Procurement of Agricultural Supplies and Equipment - Marawi for OPAPRU MNLF Transformational Program (Re-bid)", reference: "AGRI-MARAWI-003-2419-25", category: "Agriculture & Development" },
  { year: 2025, title: "Procurement of Computer Desktops & Printers for OPAPRU MNLF Transformational Program", reference: "CDP-OPAPRU-004-2506-25", category: "ICT" },
  { year: 2025, title: "Retrofitting of Academic Building (MSU Siguel Campus)", reference: "AB(SIGUEL)-008-2025", category: "Infrastructure" },
  { year: 2025, title: "Retrofitting of Academic Building (Old OSA)", reference: "AB(OSA)-006-2025", category: "Infrastructure" },
  { year: 2025, title: "Retrofitting of Academic Building (CSSH Mini Theater)", reference: "AB(CSSH-MT)-007-2025", category: "Infrastructure" },
  { year: 2025, title: "Retrofitting of Academic Building (Y-Building Audio Visual Room)", reference: "AB(Y-AVR)-005-2025", category: "Infrastructure" },
  { year: 2025, title: "Procurement of Books for Colleges", reference: "BFC-009-143-25", category: "Goods & Equipment" },
  { year: 2025, title: "Procurement of Agricultural Supplies and Equipment for the OPAPRU MNLF Transformational Program", reference: "FS-Basilan-010-1332-24", category: "Agriculture & Development" },
  { year: 2025, title: "Procurement of Goods - Expansion of Campus ICT Systems and Solutions", reference: "ECISS-011-398-25", category: "ICT" },
  { year: 2025, title: "Procurement of Various Culture Media and Laboratory Reagents and Consumables for the DOST-AMR Project (MLAFAR)", reference: "MLAFAR-012-463-25", category: "Research & Laboratory" },
  { year: 2025, title: "Invitation for Negotiated Procurement Due to Two-Failed Biddings - Agricultural Supplies and Equipment for OPAPRU MNLF Transformational Program - Lot 1", reference: "FS-Basilan-010-1332-24", category: "Agriculture & Development" },
  { year: 2025, title: "Invitation for Negotiated Procurement Due to Two-Failed Biddings - Agricultural Supplies & Equipment, Maguindanao", category: "Agriculture & Development" },
  { year: 2025, title: "Retrofitting of Academic Building (Old OSA) Re-bid", reference: "AB(OSA)-013-2025", category: "Infrastructure" },

  { year: 2024, title: "Procurement of Goods - Chemicals Reagents - MLAFAR", category: "Research & Laboratory" },
  { year: 2024, title: "Supply & Installation of Glass Doors & Windows of Infirmary & Medical Services Building Completion", reference: "FIMSB-002-136-24", category: "Infrastructure" },
  { year: 2024, title: "Advanced Campus Network Development for Enhanced Distance and Remote Learning Experience", reference: "ICT-001-193-24", category: "ICT" },
  { year: 2024, title: "Procurement of IT Equipment for the OPAPRU MNLF Transformation Program", reference: "OPAPRU-002-220-24", category: "ICT" },
  { year: 2024, title: "Equipment for Micro-level Processing of Tropical Fruits & Vegetables", reference: "TFV-004-452-24", category: "Agriculture & Development" },
  { year: 2024, title: "Completion of ICTO Building", reference: "ICTO-003-2024", category: "Infrastructure" },
  { year: 2024, title: "Construction of University Canteen", reference: "UC-005-2024", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Molecular Kits & Reagents and Laboratory Supplies for the DOST-MLAFAR Project Re-bid", reference: "MKR-008-2631-24", category: "Research & Laboratory" },
  { year: 2024, title: "Procurement of 3D Printed Anatomical Models for the College of Medicine (CHED-IDIG)", reference: "COM-3D-006-533-24", category: "Research & Laboratory" },
  { year: 2024, title: "Procurement of Complete Set-Up for Clinical Pathology Laboratory for the College of Medicine", reference: "CPL-007-614-24", category: "Research & Laboratory" },
  { year: 2024, title: "Procurement of Agricultural Equipment for the OPAPRU MNLF Transformation Program Re-bid", reference: "AE-OPAPRU-009-277-24", category: "Agriculture & Development" },
  { year: 2024, title: "Campus Modernization Project: Development of Campus Integrated Systems", reference: "CMP-010-1352-24", category: "ICT" },
  { year: 2024, title: "Procurement of Preventive Maintenance Services and Consumables for Various Research Equipment for the MINSUPALA-IRDC Project", reference: "MIN-IRDC-011-1178-24", category: "Research & Laboratory" },
  { year: 2024, title: "Supply & Installation of Window Blinds for the College of Medicine Building", reference: "COMBLINDS-01-1630-24", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment for OPAPRU MNLF Transformational Program", reference: "AGRI-OPAPRU-013-1332-24", category: "Agriculture & Development" },
  { year: 2024, title: "Construction of Senior High School Faculty Building", reference: "SHSFB-012-2024", category: "Infrastructure" },
  { year: 2024, title: "Construction of DRR Multi-Purpose Building", reference: "DRR-OPAPRU-014-2024", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Fertilizers and Seedlings for Maasim - OPAPRU MNLF Transformational Program", reference: "FS-Maasim-016-2413-24", category: "Agriculture & Development" },
  { year: 2024, title: "Construction of DRR Multi-Purpose Building (Re-bid)", reference: "DRR-OPAPRU-014-2024", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment for OPAPRU MNLF Transformational Program - Lot 1 (Re-bid)", reference: "AGRI-OPAPRU-013-1332-24", category: "Agriculture & Development" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment - Maguindanao for OPAPRU MNLF Transformational Program", reference: "AGRI-MAGUINDANAO-OPAPRU-018-2405-24", category: "Agriculture & Development" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment - Marawi for OPAPRU MNLF Transformational Program", reference: "AGRI-MARAWI-017-2419-24", category: "Agriculture & Development" },
];

export const TRANSPARENCY_SOURCE_URL = "https://msugensan.edu.ph/about/bidding-documents/";
