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

// Text reproduced from the official MSU-Gensan RFQ workbook supplied for this feature.
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

// Derived from the official workbook's B:H column widths.
const C = {
  item: "7.5%",
  qty: "10.0%",
  abc: "10.3%",
  specs: "37.5%",
  unit: "8.5%",
  unitPrice: "10.2%",
  total: "16.0%",
};
const SUPPLIER_UNIT_PRICE = "18.7%"; // F:G merged in the source form.

const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingLeft: 22,
    paddingRight: 22,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },
  form: { width: "100%", borderWidth: 1.35, borderColor: "#000000" },
  headerGrid: { flexDirection: "row", minHeight: 58, borderBottomWidth: 0.75, borderColor: "#000000" },
  brandBlock: { width: "73.6%", position: "relative", justifyContent: "center", paddingLeft: 66 },
  logo: { position: "absolute", left: 10, top: 9, width: 45, height: 45, objectFit: "contain" },
  university: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  city: { fontSize: 9.6, fontFamily: "Helvetica-Bold", marginTop: 2 },
  metaBlock: { width: "26.4%", borderLeftWidth: 1.2, borderColor: "#000000", paddingTop: 3, paddingLeft: 6, paddingRight: 4 },
  metaLine: { flexDirection: "row", alignItems: "flex-end", minHeight: 15 },
  metaLabel: { width: 68, fontSize: 7.7 },
  metaValue: { flex: 1, minHeight: 11, borderBottomWidth: 0.75, borderColor: "#000000", fontSize: 7.2, paddingLeft: 2, paddingBottom: 1 },
  titleRow: { minHeight: 31, borderBottomWidth: 0.75, borderColor: "#000000", justifyContent: "center", alignItems: "center" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 12.5 },
  supplierRow: { flexDirection: "row", minHeight: 67, borderBottomWidth: 0.75, borderColor: "#000000" },
  supplierBlock: { width: "73.6%", paddingLeft: 8, paddingTop: 3 },
  supplierLine: { flexDirection: "row", alignItems: "flex-end", minHeight: 19, width: "52%" },
  supplierLabel: { fontSize: 8.4 },
  underline: { flex: 1, height: 13, borderBottomWidth: 0.75, borderColor: "#000000", marginLeft: 3 },
  quoteBlock: { width: "26.4%", borderLeftWidth: 1.2, borderColor: "#000000", paddingLeft: 6, paddingTop: 7, paddingRight: 4 },
  quoteLine: { flexDirection: "row", alignItems: "flex-end", minHeight: 17 },
  quoteLabel: { width: 67, fontSize: 7.7 },
  quoteValue: { flex: 1, minHeight: 12, borderBottomWidth: 0.75, borderColor: "#000000", fontSize: 7.3, paddingLeft: 2, paddingBottom: 1 },
  intro: { minHeight: 25, borderBottomWidth: 0.75, borderColor: "#000000", justifyContent: "center", paddingHorizontal: 6, fontSize: 7.4 },
  terms: { paddingHorizontal: 8, paddingTop: 5, paddingBottom: 5 },
  termsTitle: { fontSize: 8.1, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  term: { fontSize: 6.55, lineHeight: 1.08, marginBottom: 1.1 },
  truly: { fontSize: 8.1, fontFamily: "Helvetica-Bold", marginTop: 2 },
  signerName: { fontSize: 10.8, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 4 },
  signerRole: { fontSize: 8.8, textAlign: "center", marginTop: 1 },
  tableHeader: { flexDirection: "row", borderTopWidth: 1.4, borderBottomWidth: 0.75, borderColor: "#000000", minHeight: 19 },
  th: { alignItems: "center", justifyContent: "center", paddingHorizontal: 1, paddingVertical: 1 },
  thText: { fontFamily: "Helvetica-Bold", fontSize: 7.25, textAlign: "center" },
  supplierNoteRow: { flexDirection: "row", minHeight: 18, borderBottomWidth: 0.75, borderColor: "#000000" },
  supplierNote: { width: SUPPLIER_UNIT_PRICE, alignItems: "center", justifyContent: "center", borderRightWidth: 1.2, borderColor: "#000000" },
  itemHeaderCell: { minHeight: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 1 },
  itemHeaderText: { fontFamily: "Helvetica-Bold", fontSize: 7.25, textAlign: "center" },
  itemRow: { flexDirection: "row", minHeight: 24, borderBottomWidth: 0.75, borderColor: "#000000", alignItems: "stretch" },
  cell: { paddingHorizontal: 2.5, paddingVertical: 3, justifyContent: "center", fontSize: 7 },
  rightBorder: { borderRightWidth: 1.2, borderColor: "#000000" },
  center: { textAlign: "center" },
  right: { textAlign: "right" },
  nothingRow: { flexDirection: "row", minHeight: 18, borderBottomWidth: 0.75, borderColor: "#000000", alignItems: "stretch" },
  nothingCenter: { width: C.specs, borderRightWidth: 1.2, borderColor: "#000000", justifyContent: "center", alignItems: "center" },
  nothingText: { fontFamily: "Helvetica-Bold", fontSize: 7.7, textAlign: "center" },
  purposeRow: { flexDirection: "row", minHeight: 18, borderBottomWidth: 0.75, borderColor: "#000000", alignItems: "center" },
  purposeSpacerLeft: { width: "17.8%" },
  purposeValue: { width: "37.5%", borderRightWidth: 1.2, borderColor: "#000000", fontSize: 7.6, textAlign: "center", paddingHorizontal: 2 },
  purposeRest: { width: "44.7%" },
  totalRow: { flexDirection: "row", minHeight: 20, borderBottomWidth: 0.75, borderColor: "#000000", alignItems: "center" },
  totalLabel: { width: "17.5%", borderRightWidth: 1.2, borderColor: "#000000", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  totalBlank: { width: "30%", borderRightWidth: 1.2, borderColor: "#000000" },
  totalValue: { width: "37.5%", borderRightWidth: 1.2, borderColor: "#000000", fontFamily: "Helvetica-Bold", fontSize: 7.7, textAlign: "right", paddingRight: 4 },
  totalRest: { width: "15%" },
  instructionsRow: { flexDirection: "row", minHeight: 20, borderBottomWidth: 0.9, borderColor: "#000000", alignItems: "center" },
  instructionsLabel: { width: "25.7%", borderRightWidth: 1.2, borderColor: "#000000", fontFamily: "Helvetica-Bold", fontSize: 8, textAlign: "center" },
  instructionsText: { width: "74.3%", fontFamily: "Helvetica-Oblique", fontSize: 7.7, paddingLeft: 5 },
  note: { textAlign: "right", fontSize: 7.7, paddingRight: 5, paddingTop: 4, paddingBottom: 2 },
  supplierFields: { minHeight: 52, flexDirection: "row", justifyContent: "flex-end", paddingRight: 4, paddingTop: 4 },
  supplierInner: { width: "35%" },
  detailLine: { flexDirection: "row", alignItems: "flex-end", minHeight: 14 },
  detailLabel: { fontSize: 7.8 },
  detailUnderline: { flex: 1, height: 11, borderBottomWidth: 0.75, borderColor: "#000000", marginLeft: 2 },
  statement: { paddingHorizontal: 7, fontSize: 7.65, lineHeight: 1.22 },
  signatureArea: { minHeight: 54, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingLeft: 5, paddingRight: 4, paddingTop: 8, paddingBottom: 3 },
  canvasser: { width: "50%", paddingLeft: "20%", fontSize: 7.6, textAlign: "center", borderBottomWidth: 0.75, borderColor: "#000000", paddingBottom: 2 },
  bidder: { width: "40%" },
  bidderLine: { height: 14, borderBottomWidth: 0.75, borderColor: "#000000" },
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

export default function RFQPDF({ rfq, items }: { rfq: RFQPdfData; items: RFQPdfItem[] }) {
  const logoSrc = typeof window !== "undefined" ? `${window.location.origin}/msu-logo.png` : "/msu-logo.png";
  const signer = rfq.template_type === "less_than_50k" ? "ENGR. NELSON P. BENARES, JR." : "RANDY P. ASTURIAS, D.Eng.";
  const signerRole = rfq.template_type === "less_than_50k" ? "Director, Procurement Management Office" : "BAC Chairman";
  const safeItems = items.length ? items : [{ item_description: "", quantity: 0, unit: "", unit_cost: 0, total_cost: 0 }];
  const total = Number(rfq.total || 0) || items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const rowWidths = { item: C.item, qty: C.qty, abc: C.abc, specs: C.specs, unit: C.unit, unitPrice: C.unitPrice, total: C.total };

  return (
    <Document title={`RFQ-${rfq.pr_no}`} author="Mindanao State University - General Santos City">
      <Page size="LETTER" style={styles.page}>
        <View style={styles.form}>
          <View style={styles.headerGrid}>
            <View style={styles.brandBlock}>
              <Image src={logoSrc} style={styles.logo} />
              <Text style={styles.university}>MINDANAO STATE UNIVERSITY</Text>
              <Text style={styles.city}>Fatima, General Santos City</Text>
            </View>
            <View style={styles.metaBlock}>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Reference Nos.</Text><Text style={styles.metaValue}>{rfq.reference_no}</Text></View>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Project Name:</Text><Text style={styles.metaValue}>{rfq.project_name}</Text></View>
              <View style={styles.metaLine}><Text style={styles.metaLabel}>Location:</Text><Text style={styles.metaValue}>{rfq.location || ""}</Text></View>
            </View>
          </View>

          <View style={styles.titleRow}><Text style={styles.title}>REQUEST FOR QUOTATION</Text></View>

          <View style={styles.supplierRow}>
            <View style={styles.supplierBlock}>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>__________________________</Text></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>Company Name</Text></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>__________________________</Text></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>Address</Text></View>
            </View>
            <View style={styles.quoteBlock}>
              <View style={styles.quoteLine}><Text style={styles.quoteLabel}>Date :</Text><Text style={styles.quoteValue}>{formatDate(rfq.rfq_date)}</Text></View>
              <View style={styles.quoteLine}><Text style={styles.quoteLabel}>Quotation No. :</Text><Text style={styles.quoteValue}></Text></View>
            </View>
          </View>

          <Text style={styles.intro}>Please quote your best proposal for item/s listed below, subject to the Terms and Conditions duly signed by your representative.</Text>

          <View style={styles.terms}>
            <Text style={styles.termsTitle}>Terms and Conditions:</Text>
            {TERMS.map((term) => <Text key={term} style={styles.term}>{term}</Text>)}
            <Text style={styles.truly}>Very truly yours,</Text>
            <Text style={styles.signerName}>{signer}</Text>
            <Text style={styles.signerRole}>{signerRole}</Text>
          </View>

          <View style={styles.tableHeader}>
            {[
              [rowWidths.item, "Item", true],
              [rowWidths.qty, "QTY", true],
              [rowWidths.abc, "ABC", true],
              [rowWidths.specs, "Technical Specifications", true],
              [SUPPLIER_UNIT_PRICE, "Unit Price", true],
              [rowWidths.total, "Total Amount", false],
            ].map(([width, text, right], index) => <View key={index} style={[styles.th, { width }, right ? styles.rightBorder : {}]}><Text style={styles.thText}>{text}</Text></View>)}
          </View>

          <View style={styles.supplierNoteRow}>
            <View style={[{ width: "81.3%" }, styles.rightBorder]} />
            <View style={styles.supplierNote}><Text style={{ fontSize: 7.1, textAlign: "center" }}>(To be filled up by the suppliers)</Text></View>
            <View style={{ width: C.total }} />
          </View>

          <View style={styles.tableRow}>
            <View style={[styles.itemHeaderCell, { width: C.item }, styles.rightBorder]} />
            <View style={[styles.itemHeaderCell, { width: C.qty }, styles.rightBorder]} />
            <View style={[styles.itemHeaderCell, { width: C.abc }, styles.rightBorder]} />
            <View style={[styles.itemHeaderCell, { width: C.specs }, styles.rightBorder]} />
            <View style={[styles.itemHeaderCell, { width: C.unit, borderRightWidth: 1.2, borderColor: "#000000" }]}><Text style={styles.itemHeaderText}>UNIT</Text></View>
            <View style={[styles.itemHeaderCell, { width: C.unitPrice, borderRightWidth: 1.2, borderColor: "#000000" }]}><Text style={styles.itemHeaderText}>UNIT PRICE</Text></View>
            <View style={[styles.itemHeaderCell, { width: C.total }]}><Text style={styles.itemHeaderText}>TOTAL AMOUNT</Text></View>
          </View>

          {safeItems.map((item, index) => (
            <View style={styles.itemRow} key={`${item.item_description}-${index}`}>
              <View style={[styles.cell, { width: C.item }, styles.rightBorder, styles.center]}><Text>{index + 1}</Text></View>
              <View style={[styles.cell, { width: C.qty }, styles.rightBorder, styles.center]}><Text>{item.quantity || ""}</Text></View>
              <View style={[styles.cell, { width: C.abc }, styles.rightBorder, styles.right]}><Text>{item.total_cost ? money(item.total_cost) : ""}</Text></View>
              <View style={[styles.cell, { width: C.specs }, styles.rightBorder]}><Text>{item.item_description}</Text></View>
              <View style={[styles.cell, { width: C.unit }, styles.rightBorder, styles.center]}><Text>{item.unit || ""}</Text></View>
              <View style={[styles.cell, { width: C.unitPrice }, styles.rightBorder]}><Text></Text></View>
              <View style={[styles.cell, { width: C.total }, styles.right]}><Text></Text></View>
            </View>
          ))}

          <View style={styles.nothingRow}>
            <View style={{ width: C.item, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.qty, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.abc, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={styles.nothingCenter}><Text style={styles.nothingText}>***NOTHING FOLLOWS***</Text></View>
            <View style={{ width: C.unit, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.unitPrice, borderRightWidth: 1.2, borderColor: "#000000" }} />
            <View style={{ width: C.total }} />
          </View>

          <View style={styles.purposeRow}>
            <View style={styles.purposeSpacerLeft} />
            <Text style={styles.purposeValue}>(Purpose) {rfq.purpose}</Text>
            <View style={styles.purposeRest} />
          </View>
          <View style={styles.purposeRow}>
            <View style={styles.purposeSpacerLeft} />
            <Text style={styles.purposeValue}>(Office) {rfq.office}</Text>
            <View style={styles.purposeRest} />
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL ABC</Text>
            <View style={styles.totalBlank} />
            <Text style={styles.totalValue}>{money(total)}</Text>
            <View style={styles.totalRest} />
          </View>

          <View style={styles.instructionsRow}>
            <Text style={styles.instructionsLabel}>Instructions:</Text>
            <Text style={styles.instructionsText}>See attached Specifications/important Instructions for items.</Text>
          </View>
          <Text style={styles.note}>(Please provide complete information below)</Text>

          <View style={styles.supplierFields}>
            <View style={styles.supplierInner}>
              <View style={styles.detailLine}><Text style={styles.detailLabel}>Delivery Period :</Text><View style={styles.detailUnderline} /></View>
              <View style={styles.detailLine}><Text style={styles.detailLabel}>Warranty:</Text><View style={styles.detailUnderline} /></View>
              <View style={styles.detailLine}><Text style={styles.detailLabel}>Price Validity :</Text><View style={styles.detailUnderline} /></View>
            </View>
          </View>

          <Text style={styles.statement}>Unit Purchase/Job Order or a Contract is prepared and executed, this Quotation/Proposal shall be binding upon us. We understand that you are not bound to accept the lowest or any Proposal you may receive.</Text>
          <View style={{ height: 5 }} />
          <Text style={styles.statement}>After having carefully read and accepted your General Conditions, I/We quote you on the item at prices noted above.</Text>

          <View style={styles.signatureArea}>
            <Text style={styles.canvasser}>__________________________________{"\n"}Signature over printed name of canvasser</Text>
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
