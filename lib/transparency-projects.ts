export type TransparencyProject = {
  year: number;
  title: string;
  reference?: string;
  category: "Infrastructure" | "Goods & Equipment" | "Services" | "ICT" | "Research & Laboratory" | "Agriculture & Development" | "Other";
};

// Publicly listed procurement projects sourced from MSU-General Santos' official
// Bidding Documents page. A listing does not by itself establish award or completion.
export const TRANSPARENCY_PROJECTS: TransparencyProject[] = [
  { year: 2026, title: "Design and Build of 4-Storey Mindanao State University-General Santos City (MSU-GS) Academic Complex Building", reference: "ACB-001-114-2026", category: "Infrastructure" },
  { year: 2026, title: "Purchase and Production of the 2024 and 2025 DARANGEN (yearbook)", reference: "UYB-002-272-26", category: "Other" },
  { year: 2026, title: "Procurement of Provision of Security Services", reference: "PSS-003-099-26", category: "Services" },
  { year: 2026, title: "Design And Build Of Mindanao State University - General Santos (MSU-GS) Academic Facility For Peace, Culture And Arts", reference: "PCA-004-759-2026", category: "Infrastructure" },
  { year: 2026, title: "Construction Of IIAIS Academic Building", reference: "IAB-006-2026", category: "Infrastructure" },
  { year: 2026, title: "Construction Of Junior High School Building 2", reference: "JRHS2-005-2026", category: "Infrastructure" },
  { year: 2026, title: "Procurement of Google Workspace Education Plus", reference: "GWS-007-993-26", category: "ICT" },

  { year: 2025, title: "Purchase and Production of the 2023 DARANGEN (yearbook)", reference: "UYB-001-1671-25", category: "Other" },
  { year: 2025, title: "Procurement of Agricultural Supplies and Equipment-Maguindanao for OPAPRU MNLF Transformational Program (RE-BID)", reference: "AGRI-MAGUINDANAO-OPAPRU-002-2405-25", category: "Agriculture & Development" },
  { year: 2025, title: "Procurement of Agricultural Supplies and Equipment - Marawi for OPAPRU MNLF Transformational Program (Re-bid)", reference: "AGRI-MARAWI-003-2419-25", category: "Agriculture & Development" },
  { year: 2025, title: "Procurement of Computer Desktops & Printers for OPAPRU MNLF Transformational Program", reference: "CDP-OPAPRU-004-2506-25", category: "ICT" },
  { year: 2025, title: "RETROFITTING OF ACADEMIC BUILDING (MSU SIGUEL CAMPUS)", reference: "AB(SIGUEL)-008-2025", category: "Infrastructure" },
  { year: 2025, title: "RETROFITTING OF ACADEMIC BUILDING (OLD OSA)", reference: "AB(OSA)-006-2025", category: "Infrastructure" },
  { year: 2025, title: "RETROFITTING OF ACADEMIC BUILDING (CSSH MINI THEATER)", reference: "AB(CSSH-MT)-007-2025", category: "Infrastructure" },
  { year: 2025, title: "RETROFITTING OF ACADEMIC BUILDING (Y-BUILDING AUDIO VISUAL ROOM)", reference: "AB (Y-AVR)-005-2025", category: "Infrastructure" },
  { year: 2025, title: "Procurement of Books for Colleges", reference: "BFC-009-143-25", category: "Goods & Equipment" },
  { year: 2025, title: "PROCUREMENT OF AGRICULTURAL SUPPLIES AND EQUIPMENT FOR THE OPAPRU MNLF TRANSFORMATIONAL PROGRAM", reference: "FS-Basilan-010-1332-24", category: "Agriculture & Development" },
  { year: 2025, title: "Procurement of Goods EXPANSION OF CAMPUS ICT SYSTEMS AND SOLUTIONS", reference: "ECISS-011-398-25", category: "ICT" },
  { year: 2025, title: "PROCUREMENT OF VARIOUS CULTURE MEDIA AND LABORATORY REAGENTS AND CONSUMABLES FOR THE DOST-AMR PROJECT (MLAFAR)", reference: "MLAFAR-012-463-25", category: "Research & Laboratory" },
  { year: 2025, title: "INVITATION FOR NEGOTIATED PROCUREMENT DUE TO TWO-FAILED BIDDINGS: PROCUREMENT OF AGRICULTURAL SUPPLIES AND EQUIPMENT FOR THE OPAPRU MNLF TRANSFORMATIONAL PROGRAM - LOT 1", reference: "FS-Basilan-010-1332-24", category: "Agriculture & Development" },
  { year: 2025, title: "INVITATION FOR NEGOTIATED PROCUREMENT DUE TO TWO-FAILED BIDDINGS: PROCUREMENT OF AGRICULTURAL SUPPLIES & EQUIPMENT- MAGUINDANAO FOR THE OPAPRU MNLF TRANSFORMATION PROGRAM", category: "Agriculture & Development" },
  { year: 2025, title: "RETROFITTING OF ACADEMIC BUILDING (OLD OSA) RE-BID", reference: "AB(OSA)-013-2025", category: "Infrastructure" },

  { year: 2024, title: "Procurement of Goods - Chemicals Reagents - MLAFAR", category: "Research & Laboratory" },
  { year: 2024, title: "Supply & Installation of Glass Doors & Windows of Infirmary & Medical Services Building Completion", reference: "FIMSB-002-136-24", category: "Infrastructure" },
  { year: 2024, title: "ADVANCED CAMPUS NETWORK DEVELOPMENT FOR ENHANCED DISTANCE AND REMOTE LEARNING EXPERIENCE", reference: "ICT-001-193-24", category: "ICT" },
  { year: 2024, title: "Procurement of IT Equipment for the OPAPRU MNLF Transformation Program", reference: "OPAPRU-002-220-24", category: "ICT" },
  { year: 2024, title: "Equipment for Micro-level Processing of Tropical Fruits & Vegetables", reference: "TFV-004-452-24", category: "Agriculture & Development" },
  { year: 2024, title: "COMPLETION OF ICTO BUILDING", reference: "ICTO-003-2024", category: "Infrastructure" },
  { year: 2024, title: "CONSTRUCTION OF UNIVERSITY CANTEEN", reference: "UC-005-2024", category: "Infrastructure" },
  { year: 2024, title: "PROCUREMENT OF MOLECULAR KITS & REAGENTS AND LABORATORY SUPPLIES FOR THE DOST-MLAFAR PROJECT RE-BID", reference: "MKR-008-2631-24", category: "Research & Laboratory" },
  { year: 2024, title: "Procurement of 3D Printed Anatomical Models for the College of Medicine (CHED-IDIG)", reference: "COM-3D-006-533-24", category: "Research & Laboratory" },
  { year: 2024, title: "Procurement of Complete Set-Up for Clinical Pathology Laboratory for the College of Medicine", reference: "CPL-007-614-24", category: "Research & Laboratory" },
  { year: 2024, title: "Procurement of Agricultural Equipment for the OPAPRU MNLF Transformation Program Re-bid", reference: "AE-OPAPRU-009-277-24", category: "Agriculture & Development" },
  { year: 2024, title: "CAMPUS MODERNIZATION PROJECT: DEVELOPMENT OF CAMPUS INTEGRATED SYSTEMS", reference: "CMP-010-1352-24", category: "ICT" },
  { year: 2024, title: "Procurement of Preventive Maintenance Services and Consumables for Various Research Equipment for the MINSUPALA - IRDC Project", reference: "MIN-IRDC-011-1178-24", category: "Research & Laboratory" },
  { year: 2024, title: "Supply & Installation of Window Blinds for the College of Medicine Building", reference: "COMBLINDS-01-1630-24", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment for OPAPRU MNLF Transformational Program", reference: "AGRI-OPAPRU-013-1332-24", category: "Agriculture & Development" },
  { year: 2024, title: "CONSTRUCTION OF SENIOR HIGH SCHOOL FACULTY BUILDING", reference: "SHSFB-012-2024", category: "Infrastructure" },
  { year: 2024, title: "CONSTRUCTION OF DRR MULTI-PURPOSE BUILDING", reference: "DRR-OPAPRU-014-2024", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Fertilizers and Seedlings for Maasim- OPAPRU MNLF Transformational Program", reference: "FS-Maasim-016-2413-24", category: "Agriculture & Development" },
  { year: 2024, title: "CONSTRUCTION OF DRR MULTI-PURPOSE BUILDING (Re-bid)", reference: "DRR-OPAPRU-014-2024", category: "Infrastructure" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment for OPAPRU MNLF Transformational Program- lot 1 (re-bid)", reference: "AGRI-OPAPRU-013-1332-24", category: "Agriculture & Development" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment-Maguindanao for OPAPRU MNLF Transformational Program", reference: "AGRI-MAGUINDANAO-OPAPRU-018-2405-24", category: "Agriculture & Development" },
  { year: 2024, title: "Procurement of Agricultural Supplies and Equipment - Marawi for OPAPRU MNLF Transformational Program", reference: "AGRI- MARAWI-017-2419-24", category: "Agriculture & Development" },

  { year: 2023, title: "Purchase and Production of the 2022 DARANGEN (yearbook)", reference: "UYB-007-2234-23", category: "Other" },
  { year: 2023, title: "COLLEGE OF MEDICINE BUILDING, PHASE-4", reference: "COM4-009-2023", category: "Infrastructure" },
  { year: 2023, title: "TRANSFORMATIVE SMART CAMPUS MODERNIZATION PROGRAM", reference: "ICT-008-2232-23", category: "ICT" },
  { year: 2023, title: "DOST-AMR Project (MLAFAR)", reference: "DOST-AMR-007-1694-23", category: "Research & Laboratory" },
  { year: 2023, title: "Procurement of Medical Simulation and Clinical Trainer Equipment for COM CHED-SEEDD CYCLE 2", reference: "SEEDD2-006-1477-23", category: "Goods & Equipment" },
  { year: 2023, title: "NEGOTIATED PROCUREMENT: TWO-FAILED BIDDINGS COLLEGE OF MEDICINE BUILDING, PHASE-3", reference: "COM3-003-2221-23", category: "Infrastructure" },
  { year: 2023, title: "PROCUREMENT OF LABORATORY EQUIPMENT & REAGENTS FOR MEDICAL SERVICES", reference: "MS-005-1325-23", category: "Research & Laboratory" },
  { year: 2023, title: "PROCUREMENT OF INTERNET SUBSCRIPTION FOR 2 YEARS", reference: "ICTO-IS-004-909-23", category: "ICT" },
  { year: 2023, title: "CONSTRUCTION OF ICTO BUILDING PHASE 1", reference: "ICTO-004-2023", category: "Infrastructure" },
  { year: 2023, title: "CONSTRUCTION OF VIRTUAL LEARNING STUDIO", reference: "VLS-005-2023", category: "Infrastructure" },
  { year: 2023, title: "COLLEGE OF MEDICINE BUILDING, PHASE-3 (2nd Bidding)", reference: "COM3-003-2221-23", category: "Infrastructure" },
  { year: 2023, title: "Procurement of Books for Colleges", reference: "BFC-002-545-2023", category: "Goods & Equipment" },
  { year: 2023, title: "Procurement of Medical Simulation Equipment (Examination Trainer) Re-bid", reference: "IDIG2-003-0103-1235-22", category: "Goods & Equipment" },
  { year: 2023, title: "Supply and Delivery of IT Equipment", reference: "ICTO-001-190-23", category: "ICT" },

  { year: 2022, title: "Procurement of Medical Educational Equipment for the College of Medicine", reference: "COMSEEDD1-0020109-1016-22", category: "Goods & Equipment" },
  { year: 2022, title: "Procurement of Medical Simulation Equipment (IDIG 2022) - College of Medicine", reference: "IDIG2-003-0107-1235-22", category: "Goods & Equipment" },
  { year: 2022, title: "Procurement of Equipment for Microlevel Processing of Tropical Fruits and Vegetables", reference: "AGRI-004-1250-22", category: "Agriculture & Development" },
  { year: 2022, title: "DISPOSAL - Invitation to Bid", category: "Other" },
  { year: 2022, title: "Procurement of Medical Simulation Equipment (IDIG2022)", reference: "COMSEEDD1-0020109-1016-22", category: "Goods & Equipment" },
  { year: 2022, title: "Procurement of Medical Educational Equipment for the COM Re-bid", reference: "COMSEEDD1-0020109-1016-22", category: "Goods & Equipment" },
  { year: 2022, title: "COLLEGE OF MEDICINE BUILDING, PHASE-3", reference: "COM3-006-2221-22", category: "Infrastructure" },
  { year: 2022, title: "Procurement of Medical Equipment for COM CHED-SEEDD Cycle 2 Project", reference: "SEED2-007-2358-22", category: "Goods & Equipment" },
  { year: 2022, title: "Procurement of Medical Books for COM CHED-SEEDD Cycle 2 Project", reference: "SEED2-007A-2358-22", category: "Goods & Equipment" },
];

export const TRANSPARENCY_SOURCE_URL = "https://msugensan.edu.ph/about/bidding-documents/";
