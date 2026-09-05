import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Styles matching the official MSU General Santos City Purchase Request template
const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingLeft: 36,
    paddingRight: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  // Main outer border bounding the entire standard PR form
  formBorder: {
    borderWidth: 1.5,
    borderColor: "#000000",
    width: "100%",
  },
  // Header Section
  header: {
    borderBottomWidth: 1.2,
    borderColor: "#000000",
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 3,
    textAlign: "center",
  },

  // Metadata Section (Department, Section, PR No, SAI No, ALOBS No, Dates)
  metaContainer: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderColor: "#000000",
  },
  metaLeftCol: {
    width: "48%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
  },
  metaRightCol: {
    width: "52%",
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
  },
  metaFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    minHeight: 14,
  },
  metaLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#000000",
  },
  metaUnderlineVal: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    paddingLeft: 4,
    paddingBottom: 1,
    marginLeft: 3,
  },
  metaSplitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    minHeight: 14,
  },
  metaSubColLeft: {
    width: "55%",
    flexDirection: "row",
    alignItems: "center",
  },
  metaSubColRight: {
    width: "45%",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
  },

  // Items Table Header
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    minHeight: 22,
    alignItems: "center",
  },
  thText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#000000",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  thTextItalic: {
    fontSize: 8.5,
    fontFamily: "Helvetica-BoldOblique",
    textAlign: "center",
    color: "#000000",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },

  // Column Widths
  colQty: {
    width: "11%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "center",
  },
  colUnit: {
    width: "10%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "center",
  },
  colDesc: {
    width: "41%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
  },
  colStock: {
    width: "10%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "center",
  },
  colUnitCost: {
    width: "14%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "right",
  },
  colTotalCost: {
    width: "14%",
    textAlign: "right",
  },

  // Item Rows
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    minHeight: 20,
    alignItems: "center",
  },
  cellQty: {
    width: "11%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 8.5,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  cellUnit: {
    width: "10%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 8.5,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  cellDesc: {
    width: "41%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    fontSize: 8.5,
    paddingLeft: 6,
    paddingRight: 4,
    paddingVertical: 3,
  },
  cellStock: {
    width: "10%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "center",
    fontSize: 8.5,
    paddingHorizontal: 2,
    paddingVertical: 3,
  },
  cellUnitCost: {
    width: "14%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    textAlign: "right",
    fontSize: 8.5,
    paddingRight: 6,
    paddingVertical: 3,
  },
  cellTotalCost: {
    width: "14%",
    textAlign: "right",
    fontSize: 8.5,
    paddingRight: 6,
    paddingVertical: 3,
  },

  // Nothing Follows row
  nothingFollowsRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    minHeight: 18,
    alignItems: "center",
  },
  nothingFollowsText: {
    width: "100%",
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    paddingVertical: 2,
  },

  // Blank grid row
  blankRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    minHeight: 18,
  },

  // Purpose Row
  purposeRow: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderColor: "#000000",
    minHeight: 24,
    alignItems: "center",
  },
  purposeLeft: {
    width: "86%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  purposeLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-BoldOblique",
    marginRight: 6,
  },
  purposeText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Oblique",
    flex: 1,
  },
  purposeTotalVal: {
    width: "14%",
    textAlign: "right",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    paddingRight: 6,
    paddingVertical: 4,
  },

  // Signature Block Header
  sigHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderColor: "#000000",
  },
  sigHeaderColLeft: {
    width: "50%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  sigHeaderColRight: {
    width: "50%",
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  sigHeaderText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    textTransform: "uppercase",
  },

  // Signature Block Body
  sigBodyRow: {
    flexDirection: "row",
    minHeight: 74,
  },
  sigBodyLeft: {
    width: "50%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    justifyContent: "space-between",
  },
  sigBodyRight: {
    width: "50%",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sigFieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sigFieldLabel: {
    width: 68,
    fontSize: 8,
    fontFamily: "Helvetica",
  },
  sigFieldValue: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  approverName: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  approverDesignation: {
    fontSize: 8,
    fontFamily: "Helvetica",
    textAlign: "center",
  },
});

interface PRPDFProps {
  pr: {
    pr_no?: string;
    department?: string;
    section?: string | null;
    purpose?: string;
    total?: number;
    current_stage?: string;
    printed_name?: string;
    designation?: string | null;
    pr_date?: string;
    sai_no?: string | null;
    sai_date?: string | null;
    alobs_no?: string | null;
    alobs_date?: string | null;
    created_at?: string;
    approved_by?: string;
    approved_by_designation?: string;
  };
  items: Array<{
    item_description: string;
    quantity: number;
    unit: string;
    stock_no?: string | null;
    unit_cost: number;
    total_cost: number;
  }>;
}

export default function PRPDF({ pr = {}, items = [] }: PRPDFProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePr = pr || {};
  const totalAmount = (Number(safePr.total) > 0 ? Number(safePr.total) : 0) || safeItems.reduce((sum, item) => sum + (Number(item?.total_cost) || (Number(item?.unit_cost || 0) * Number(item?.quantity || 0))), 0);

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const formattedPrDate = formatDate(safePr.pr_date || safePr.created_at);
  const formattedSaiDate = formatDate(safePr.sai_date || safePr.pr_date || safePr.created_at);
  const formattedAlobsDate = formatDate(safePr.alobs_date || safePr.pr_date || safePr.created_at);

  // Maintain minimum 5 blank rows after items to preserve standard physical PR sheet height
  const minRows = 5;
  const blankRowsCount = Math.max(0, minRows - safeItems.length);

  return (
    <Document title={`PR-${safePr.pr_no || "MSU-Gensan"}`} author="Mindanao State University - General Santos City">
      <Page size="A4" style={styles.page}>
        {/* Main Boxed Container */}
        <View style={styles.formBorder}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>PURCHASE REQUEST</Text>
            <Text style={styles.headerSubtitle}>MINDANAO STATE UNIVERSITY - General Santos City</Text>
          </View>

          {/* Department, Section, PR No, SAI No, ALOBS No Metadata Grid */}
          <View style={styles.metaContainer}>
            {/* Left Column: Department & Section */}
            <View style={styles.metaLeftCol}>
              <View style={styles.metaFieldRow}>
                <Text style={styles.metaLabel}>Department</Text>
                <Text style={styles.metaUnderlineVal}>{safePr.department || ""}</Text>
              </View>
              <View style={styles.metaFieldRow}>
                <Text style={styles.metaLabel}>Section</Text>
                <Text style={styles.metaUnderlineVal}>{safePr.section || ""}</Text>
              </View>
            </View>

            {/* Right Column: PR No, SAI No, ALOBS No with respective Dates */}
            <View style={styles.metaRightCol}>
              {/* Row 1: PR No. & Date */}
              <View style={styles.metaSplitRow}>
                <View style={styles.metaSubColLeft}>
                  <Text style={styles.metaLabel}>PR No.</Text>
                  <Text style={styles.metaUnderlineVal}>{safePr.pr_no || ""}</Text>
                </View>
                <View style={styles.metaSubColRight}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaUnderlineVal}>{formattedPrDate}</Text>
                </View>
              </View>

              {/* Row 2: SAI No. & Date (Left empty per official template) */}
              <View style={styles.metaSplitRow}>
                <View style={styles.metaSubColLeft}>
                  <Text style={styles.metaLabel}>SAI No.</Text>
                  <Text style={styles.metaUnderlineVal}> </Text>
                </View>
                <View style={styles.metaSubColRight}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaUnderlineVal}> </Text>
                </View>
              </View>

              {/* Row 3: ALOBS No. & Date (Left empty per official template) */}
              <View style={styles.metaSplitRow}>
                <View style={styles.metaSubColLeft}>
                  <Text style={styles.metaLabel}>ALOBS No.</Text>
                  <Text style={styles.metaUnderlineVal}> </Text>
                </View>
                <View style={styles.metaSubColRight}>
                  <Text style={styles.metaLabel}>Date</Text>
                  <Text style={styles.metaUnderlineVal}> </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Table Column Headers */}
          <View style={styles.tableHeader}>
            <View style={styles.colQty}>
              <Text style={styles.thText}>Quantity</Text>
            </View>
            <View style={styles.colUnit}>
              <Text style={styles.thText}>Unit</Text>
            </View>
            <View style={styles.colDesc}>
              <Text style={styles.thTextItalic}>ITEM DESCRIPTION</Text>
            </View>
            <View style={styles.colStock}>
              <Text style={styles.thText}>Stock No.</Text>
            </View>
            <View style={styles.colUnitCost}>
              <Text style={styles.thTextItalic}>Estimated{"\n"}Unit Cost</Text>
            </View>
            <View style={styles.colTotalCost}>
              <Text style={styles.thTextItalic}>Estimated{"\n"}Cost</Text>
            </View>
          </View>

          {/* Table Items */}
          {safeItems.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.cellQty}>{item.quantity}</Text>
              <Text style={styles.cellUnit}>{item.unit || "pcs"}</Text>
              <Text style={styles.cellDesc}>{item.item_description}</Text>
              <Text style={styles.cellStock}>{item.stock_no || ""}</Text>
              <Text style={styles.cellUnitCost}>
                {Number(item.unit_cost) > 0 ? Number(item.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
              </Text>
              <Text style={styles.cellTotalCost}>
                {Number(item.total_cost) > 0 ? Number(item.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
              </Text>
            </View>
          ))}

          {/* ****Nothing Follows**** Row */}
          <View style={styles.nothingFollowsRow}>
            <View style={styles.colQty}><Text style={{ fontSize: 8.5 }}> </Text></View>
            <View style={styles.colUnit}><Text style={{ fontSize: 8.5 }}> </Text></View>
            <View style={styles.colDesc}>
              <Text style={styles.nothingFollowsText}>****Nothing Follows****</Text>
            </View>
            <View style={styles.colStock}><Text style={{ fontSize: 8.5 }}> </Text></View>
            <View style={styles.colUnitCost}><Text style={{ fontSize: 8.5 }}> </Text></View>
            <View style={styles.colTotalCost}><Text style={{ fontSize: 8.5 }}> </Text></View>
          </View>

          {/* Blank Spacer Rows to retain official template height */}
          {Array.from({ length: blankRowsCount }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.blankRow}>
              <View style={styles.colQty}><Text style={{ fontSize: 8.5 }}> </Text></View>
              <View style={styles.colUnit}><Text style={{ fontSize: 8.5 }}> </Text></View>
              <View style={styles.colDesc}><Text style={{ fontSize: 8.5 }}> </Text></View>
              <View style={styles.colStock}><Text style={{ fontSize: 8.5 }}> </Text></View>
              <View style={styles.colUnitCost}><Text style={{ fontSize: 8.5 }}> </Text></View>
              <View style={styles.colTotalCost}><Text style={{ fontSize: 8.5 }}> </Text></View>
            </View>
          ))}

          {/* Purpose Row */}
          <View style={styles.purposeRow}>
            <View style={styles.purposeLeft}>
              <Text style={styles.purposeLabel}>Purpose</Text>
              <Text style={styles.purposeText}>{safePr.purpose || ""}</Text>
            </View>
            <Text style={styles.purposeTotalVal}>
              {totalAmount > 0
                ? totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "-"}
            </Text>
          </View>

          {/* Signatures Header */}
          <View style={styles.sigHeaderRow}>
            <View style={styles.sigHeaderColLeft}>
              <Text style={styles.sigHeaderText}>REQUESTED BY</Text>
            </View>
            <View style={styles.sigHeaderColRight}>
              <Text style={styles.sigHeaderText}>APPROVED BY</Text>
            </View>
          </View>

          {/* Signatures Body */}
          <View style={styles.sigBodyRow}>
            {/* Left Column: REQUESTED BY (Signature, Printed Name, Designation) */}
            <View style={styles.sigBodyLeft}>
              <View style={styles.sigFieldRow}>
                <Text style={styles.sigFieldLabel}>Signature</Text>
                <Text style={styles.sigFieldValue}> </Text>
              </View>
              <View style={styles.sigFieldRow}>
                <Text style={styles.sigFieldLabel}>Printed Name</Text>
                <Text style={styles.sigFieldValue}>
                  {(safePr.printed_name && safePr.printed_name.includes("@")
                    ? safePr.printed_name.split("@")[0].replace(/[._]/g, " ")
                    : (safePr.printed_name || "")
                  ).toUpperCase()}
                </Text>
              </View>
              <View style={styles.sigFieldRow}>
                <Text style={styles.sigFieldLabel}>Designation</Text>
                <Text style={styles.sigFieldValue}>{safePr.designation || ""}</Text>
              </View>
            </View>

            {/* Right Column: APPROVED BY (Chancellor Atty. Shidik T. Abantas, MDM, LLM) */}
            <View style={styles.sigBodyRight}>
              <Text style={styles.approverName}>
                {safePr.approved_by || "Atty. Shidik T. Abantas, MDM, LLM"}
              </Text>
              <Text style={styles.approverDesignation}>
                {safePr.approved_by_designation || "Chancellor"}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
