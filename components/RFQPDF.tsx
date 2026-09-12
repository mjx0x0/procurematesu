import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type RFQTemplateType = "less_than_50k" | "more_than_50k";

export interface RFQPdfData {
  template_type: RFQTemplateType;
  reference_no: string;
  project_name: string;
  location?: string | null;
  rfq_date: string;
  pr_no: string;
  purpose: string;
  office: string;
  total: number;
}

export interface RFQPdfItem {
  item_description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

const TERMS = [
  "1. Mayor's/Business Permit",
  "2. Philgeps Registration Certificate",
  "3. Supplier/Bidder previously submitted documentary requirements may not submit.",
  "4. All entries shall be typed or written in a clear legible manner",
  "5. No alternate quotation/offer is allowed, suppliers who submitted more than one quotation shall be automatically disqualified.",
  "6. All prices offered herein are valid, binding and effective for THIRTY (30) calendar days upon issuance of this document. Alternate bids shall be rejected.",
  "7. Delivery period within fifteen (15) Calendar Days",
  "8. Price validity shall be for period of thirty (30) Calendar Days.",
  "9. Bidders shall submit original brochures showing certifications of the product being offered.",
  "10. In case suppliers pro forma quotation is submitted, conditions will be governed by the submitted signed Terms of Reference/Technical Specifications.",
  "11. Partial bid is allowed, evaluation, comparison and contract award shall be made PER ITEM; partial bid is not allowed; the goods are grouped in a single lot, evaluation, comparison, and contract award shall be made PER LOT",
] as const;

// Column proportions derived from the uploaded official MSU-Gensan workbook B:H widths.
const C = {
  item: "7.5%",
  qty: "10.0%",
  abc: "10.3%",
  tech: "37.5%",
  unit: "8.5%",
  unitPrice: "10.2%",
  total: "16.0%",
};

const border = { borderColor: "#000000" } as const;

const styles = StyleSheet.create({
  page: {
    size: "LETTER",
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },
  form: { width: "100%", borderWidth: 1.35, borderColor: "#000000" },
  header: {
    minHeight: 63,
    borderBottomWidth: 1.2,
    ...border,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 62,
  },
  logo: { position: "absolute", left: 14, top: 10, width: 45, height: 45, objectFit: "contain" },
  university: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  city: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 2 },
  title: { fontSize: 12.5, fontFamily: "Helvetica-Bold", marginTop: 9 },
  metadata: { flexDirection: "row", minHeight: 77, borderBottomWidth: 1.2, ...border },
  supplierBlock: { width: "73.6%", borderRightWidth: 1.2, ...border, paddingLeft: 8, paddingTop: 3 },
  supplierLine: { width: "94%", flexDirection: "row", alignItems: "flex-end", minHeight: 21 },
  supplierLabel: { fontSize: 8.6 },
  underline: { flex: 1, height: 14, borderBottomWidth: 0.75, ...border, marginLeft: 3 },
  metaRight: { width: "26.4%", paddingLeft: 5, paddingRight: 4, paddingTop: 4, paddingBottom: 3 },
  metaLine: { flexDirection: "row", alignItems: "flex-end", minHeight: 15.5 },
  metaLabel: { width: 70, fontSize: 7.7 },
  metaValue: { flex: 1, minHeight: 12, borderBottomWidth: 0.75, ...border, fontSize: 7.4, paddingLeft: 2, paddingBottom: 1 },
  instruction: { minHeight: 26, borderBottomWidth: 0.75, ...border, paddingHorizontal: 6, justifyContent: "center", fontSize: 7.3 },
  terms: { paddingLeft: 8, paddingRight: 8, paddingTop: 5, paddingBottom: 5 },
  termsTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.2, marginBottom: 3.5 },
  term: { fontSize: 6.65, lineHeight: 1.09, marginBottom: 1.15 },
  truly: { fontFamily: "Helvetica-Bold", fontSize: 8.2, marginTop: 2 },
  signatoryName: { fontFamily: "Helvetica-Bold", fontSize: 10.7, textAlign: "center", marginTop: 4.5 },
  signatoryRole: { fontSize: 8.8, textAlign: "center", marginTop: 1 },
  tableRow: { flexDirection: "row", alignItems: "stretch", borderBottomWidth: 0.75, ...border },
  topCell: { minHeight: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 1, paddingVertical: 1 },
  hText: { fontFamily: "Helvetica-Bold", fontSize: 7.2, textAlign: "center" },
  itemRow: { minHeight: 24, flexDirection: "row", alignItems: "stretch", borderBottomWidth: 0.75, ...border },
  itemCell: { paddingHorizontal: 2.5, paddingVertical: 3, fontSize: 7.0, justifyContent: "center" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
  nothingRow: { minHeight: 18, flexDirection: "row", alignItems: "stretch", borderBottomWidth: 0.75, ...border },
  nothingTextCell: { width: C.tech, borderRightWidth: 1.2, ...border, justifyContent: "center", alignItems: "center" },
  nothingText: { fontFamily: "Helvetica-Bold", fontSize: 7.6, textAlign: "center" },
  purposeRow: { minHeight: 18, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.75, ...border },
  purposeLabel: { width: "17.8%", paddingLeft: 7, fontSize: 7.6, textAlign: "center" },
  purposeValue: { width: "82.2%", fontSize: 7.6, paddingLeft: 2, paddingRight: 4 },
  totalRow: { minHeight: 20, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.75, ...border },
  totalLabel: { width: "21%", fontFamily: "Helvetica-Bold", fontSize: 8.0, textAlign: "center" },
  totalBlank: { width: "10.3%", borderRightWidth: 1.2, ...border },
  totalValue: { width: "30.4%", fontFamily: "Helvetica-Bold", fontSize: 7.7, textAlign: "right", paddingRight: 4, borderRightWidth: 1.2, ...border },
  totalRest: { width: "38.3%" },
  instructionsRow: { minHeight: 20, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.9, ...border },
  instructionsLabel: { width: "29.2%", fontFamily: "Helvetica-Bold", fontSize: 8.0, textAlign: "center" },
  instructionsText: { width: "70.8%", borderLeftWidth: 1.2, ...border, fontFamily: "Helvetica-Oblique", fontSize: 7.7, paddingLeft: 5 },
  note: { textAlign: "right", fontSize: 7.7, paddingRight: 5, paddingTop: 4, paddingBottom: 2 },
  supplierFields: { minHeight: 52, flexDirection: "row", justifyContent: "flex-end", paddingTop: 4, paddingRight: 5, paddingBottom: 4 },
  supplierFieldsInner: { width: "39%" },
  detailLine: { flexDirection: "row", alignItems: "flex-end", minHeight: 14 },
  detailLabel: { fontSize: 7.7 },
  detailUnderline: { flex: 1, height: 11, borderBottomWidth: 0.75, ...border, marginLeft: 2 },
  statement: { paddingHorizontal: 7, fontSize: 7.7, lineHeight: 1.22 },
  signatureArea: { minHeight: 47, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingLeft: 7, paddingRight: 5, paddingTop: 7, paddingBottom: 3 },
  canvasser: { width: "45%", textAlign: "center", fontSize: 7.7, borderBottomWidth: 0.75, ...border, paddingBottom: 2 },
  bidder: { width: "41%" },
  bidderLine: { height: 14, borderBottomWidth: 0.75, ...border },
  small: { fontSize: 7.5, paddingTop: 1 },
});

function money(value: number) {
  return Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Cell({ width, children, right = true, style }: { width: string; children?: React.ReactNode; right?: boolean; style?: any }) {
  return <View style={[{ width, ...(right ? { borderRightWidth: 1.2, borderColor: "#000000" } : {}) }, style]}>{children}</View>;
}

export default function RFQPDF({ rfq, items }: { rfq: RFQPdfData; items: RFQPdfItem[] }) {
  const logoSrc = typeof window !== "undefined" ? `${window.location.origin}/msu-logo.png` : "/msu-logo.png";
  const signer = rfq.template_type === "less_than_50k" ? "ENGR. NELSON P. BENARES, JR." : "RANDY P. ASTURIAS, D.Eng.";
  const signerRole = rfq.template_type === "less_than_50k" ? "Director, Procurement Management Office" : "BAC Chairman";
  const total = Number(rfq.total || 0) || items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const safeItems = items.length ? items : [{ item_description: "", quantity: 0, unit: "", unit_cost: 0, total_cost: 0 }];

  return (
    <Document title={`RFQ-${rfq.pr_no}`} author="Mindanao State University - General Santos City">
      <Page size="LETTER" style={styles.page}>
        <View style={styles.form}>
          <View style={styles.header}>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.university}>MINDANAO STATE UNIVERSITY</Text>
            <Text style={styles.city}>Fatima, General Santos City</Text>
            <Text style={styles.title}>REQUEST FOR QUOTATION</Text>
          </View>

          <View style={styles.metadata}>
            <View style={styles.supplierBlock}>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>Company Name</Text><View style={styles.underline} /></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}></Text><View style={styles.underline} /></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>Address</Text><View style={styles.underline} /></View>
            </View>
            <View style={styles.metaRight}>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Reference Nos.</Text><Text style={styles.metaValue}>{rfq.reference_no}</Text></View>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Project Name:</Text><Text style={styles.metaValue}>{rfq.project_name}</Text></View>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Location:</Text><Text style={styles.metaValue}>{rfq.location || ""}</Text></View>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Date :</Text><Text style={styles.metaValue}>{formatDate(rfq.rfq_date)}</Text></View>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Quotation No. :</Text><Text style={styles.metaValue}></Text></View>
            </View>
          </View>

          <Text style={styles.instruction}>Please quote your best proposal for item/s listed below, subject to the Terms and Conditions duly signed by your representative.</Text>

          <View style={styles.terms}>
            <Text style={styles.termsTitle}>Terms and Conditions:</Text>
            {TERMS.map((term) => <Text key={term} style={styles.term}>{term}</Text>)}
            <Text style={styles.truly}>Very truly yours,</Text>
            <Text style={styles.signatoryName}>{signer}</Text>
            <Text style={styles.signatoryRole}>{signerRole}</Text>
          </View>

          <View style={styles.tableRow}>
            <Cell width={C.item} style={styles.topCell}><Text style={styles.hText}>Item</Text></Cell>
            <Cell width={C.qty} style={styles.topCell}><Text style={styles.hText}>QTY</Text></Cell>
            <Cell width={C.abc} style={styles.topCell}><Text style={styles.hText}>ABC</Text></Cell>
            <Cell width={C.tech} style={styles.topCell}><Text style={styles.hText}>Technical Specifications</Text></Cell>
            <Cell width={`${parseFloat(C.unit) + parseFloat(C.unitPrice)}%`} style={styles.topCell}><Text style={styles.hText}>Unit Price</Text></Cell>
            <View style={[styles.topCell, { width: C.total }]}><Text style={styles.hText}>Total Amount</Text></View>
          </View>

          <View style={styles.tableRow}>
            <View style={{ width: C.item, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.qty, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.abc, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.tech, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: `${parseFloat(C.unit) + parseFloat(C.unitPrice)}%`, borderRightWidth: 1.2, borderColor: "#000000", minHeight: 18, justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 7.1, textAlign: "center" }}>(To be filled up by the suppliers)</Text></View>
            <View style={{ width: C.total }} />
          </View>

          {safeItems.map((item, index) => (
            <View style={styles.itemRow} key={`${item.item_description}-${index}`}>
              <View style={[styles.itemCell, { width: C.item, borderRightWidth: 1.2, borderColor: "#000000" }, styles.center]}><Text>{index + 1}</Text></View>
              <View style={[styles.itemCell, { width: C.qty, borderRightWidth: 1.2, borderColor: "#000000" }, styles.center]}><Text>{item.quantity || ""}</Text></View>
              <View style={[styles.itemCell, { width: C.abc, borderRightWidth: 1.2, borderColor: "#000000" }, styles.right]}><Text>{item.total_cost ? money(item.total_cost) : ""}</Text></View>
              <View style={[styles.itemCell, { width: C.tech, borderRightWidth: 1.2, borderColor: "#000000" }]}><Text>{item.item_description}</Text></View>
              <View style={[styles.itemCell, { width: C.unit, borderRightWidth: 1.2, borderColor: "#000000" }, styles.center]}><Text>{item.unit || ""}</Text></View>
              <View style={[styles.itemCell, { width: C.unitPrice, borderRightWidth: 1.2, borderColor: "#000000" }]}><Text></Text></View>
              <View style={[styles.itemCell, { width: C.total }, styles.right]}><Text></Text></View>
            </View>
          ))}

          <View style={styles.nothingRow}>
            <View style={{ width: C.item, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.qty, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.abc, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={styles.nothingTextCell}><Text style={styles.nothingText}>***NOTHING FOLLOWS***</Text></View>
            <View style={{ width: C.unit, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.unitPrice, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.total }} />
          </View>

          <View style={styles.purposeRow}><Text style={styles.purposeLabel}>(Purpose)</Text><Text style={styles.purposeValue}>{rfq.purpose}</Text><View style={styles.purposeRightBlank} /></View>
          <View style={styles.purposeRow}><Text style={styles.purposeLabel}>(Office)</Text><Text style={styles.purposeValue}>{rfq.office}</Text><View style={styles.purposeRightBlank} /></View>

          <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL ABC</Text><View style={styles.totalBlank} /><Text style={styles.totalValue}>{money(total)}</Text><View style={styles.totalRest} /></View>
          <View style={styles.instructionsRow}><Text style={styles.instructionsLabel}>Instructions:</Text><Text style={styles.instructionsText}>See attached Specifications/important Instructions for items.</Text></View>
          <Text style={styles.note}>(Please provide complete information below)</Text>

          <View style={styles.supplierFields}>
            <View style={styles.supplierFieldsInner}>
              <View style={styles.detailLine}><Text style={styles.detailLabel}>Delivery Period :</Text><View style={styles.detailUnderline} /></View>
              <View style={styles.detailLine}><Text style={styles.detailLabel}>Warranty:</Text><View style={styles.detailUnderline} /></View>
              <View style={styles.detailLine}><Text style={styles.detailLabel}>Price Validity :</Text><View style={styles.detailUnderline} /></View>
            </View>
          </View>

          <Text style={styles.statement}>Unit Purchase/Job Order or a Contract is prepared and executed, this Quotation/Proposal shall be binding upon us. We understand that you are not bound to accept the lowest or any Proposal you may receive.</Text>
          <View style={{ height: 5 }} />
          <Text style={styles.statement}>After having carefully read and accepted your General Conditions, I/We quote you on the item at prices noted above.</Text>

          <View style={styles.signatureArea}>
            <Text style={styles.canvasser}>Signature over printed name of canvasser</Text>
            <View style={styles.bidder}>
              <View style={styles.bidderLine} />
              <Text style={styles.small}>Signature over printed name of bidder</Text>
              <Text style={styles.small}>Tel. No. / Cellphone No.: __________</Text>
              <Text style={styles.small}>E-mail address: _____________________</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
