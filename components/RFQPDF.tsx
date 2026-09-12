import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    size: "LETTER",
    paddingTop: 20,
    paddingBottom: 18,
    paddingLeft: 24,
    paddingRight: 24,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000000",
    backgroundColor: "#FFFFFF",
  },
  form: {
    width: "100%",
    borderWidth: 1.4,
    borderColor: "#000000",
  },
  header: {
    minHeight: 60,
    borderBottomWidth: 1.2,
    borderColor: "#000000",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 55,
    paddingRight: 55,
  },
  logo: {
    position: "absolute",
    left: 16,
    top: 10,
    width: 42,
    height: 42,
    objectFit: "contain",
  },
  university: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  locationLine: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
    textAlign: "center",
  },
  title: {
    fontSize: 12.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 9,
    marginBottom: 3,
    textAlign: "center",
  },
  meta: {
    flexDirection: "row",
    borderBottomWidth: 1.2,
    borderColor: "#000000",
    minHeight: 84,
  },
  leftMeta: {
    width: "52%",
    paddingLeft: 10,
    paddingTop: 6,
    paddingBottom: 6,
    borderRightWidth: 1.2,
    borderColor: "#000000",
  },
  rightMeta: {
    width: "48%",
    paddingLeft: 10,
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 8,
  },
  line: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 18,
  },
  lineLabel: {
    fontSize: 8.5,
    width: 86,
  },
  lineValue: {
    flex: 1,
    fontSize: 8.5,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    paddingLeft: 3,
    paddingBottom: 1,
  },
  supplierLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 22,
    width: "60%",
  },
  supplierLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica",
  },
  supplierUnderline: {
    flex: 1,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    height: 15,
    marginLeft: 2,
  },
  instruction: {
    borderBottomWidth: 0.9,
    borderColor: "#000000",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 7,
    paddingBottom: 7,
    fontSize: 8,
  },
  termsTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    marginBottom: 5,
  },
  terms: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 7,
    paddingBottom: 6,
  },
  term: {
    fontSize: 7.1,
    lineHeight: 1.18,
    marginBottom: 1.7,
  },
  truly: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8.3,
    marginTop: 3,
  },
  signatoryName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "center",
    marginTop: 7,
  },
  signatoryRole: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
  tableHeaderTop: {
    flexDirection: "row",
    minHeight: 19,
    borderTopWidth: 1.4,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
  },
  tableHeaderBottom: {
    flexDirection: "row",
    minHeight: 19,
    borderBottomWidth: 1.2,
    borderColor: "#000000",
  },
  colItem: { width: "30%", borderRightWidth: 1.2, borderColor: "#000000" },
  colQty: { width: "8%", borderRightWidth: 1.2, borderColor: "#000000" },
  colAbc: { width: "12%", borderRightWidth: 1.2, borderColor: "#000000" },
  colTech: { width: "30%", borderRightWidth: 1.2, borderColor: "#000000" },
  colUnit: { width: "7%", borderRightWidth: 1.2, borderColor: "#000000" },
  colUnitPrice: { width: "13%", borderRightWidth: 1.2, borderColor: "#000000" },
  colTotal: { width: "13%" },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 2,
    paddingRight: 2,
    paddingTop: 2,
    paddingBottom: 2,
  },
  headerText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.6,
    textAlign: "center",
  },
  headerItalic: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: 7.6,
    textAlign: "center",
  },
  supplierHeader: {
    fontSize: 7.4,
    textAlign: "center",
    paddingTop: 2,
    paddingBottom: 2,
  },
  row: {
    flexDirection: "row",
    minHeight: 22,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    alignItems: "stretch",
  },
  cell: {
    paddingLeft: 3,
    paddingRight: 3,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 7.4,
  },
  cellCenter: {
    textAlign: "center",
  },
  cellRight: {
    textAlign: "right",
  },
  nothing: {
    flexDirection: "row",
    minHeight: 19,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    alignItems: "center",
  },
  nothingText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  purposeRow: {
    flexDirection: "row",
    minHeight: 19,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    alignItems: "center",
  },
  purposeLabel: {
    width: "30%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
    paddingLeft: 10,
    fontSize: 8,
  },
  purposeText: {
    width: "70%",
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 8,
  },
  totalRow: {
    flexDirection: "row",
    minHeight: 22,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    alignItems: "center",
  },
  totalLabel: {
    width: "50%",
    paddingLeft: 26,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  totalValue: {
    width: "12%",
    borderRightWidth: 1.2,
    borderColor: "#000000",
  },
  totalSpacer: {
    flex: 1,
  },
  instructionsRow: {
    flexDirection: "row",
    minHeight: 21,
    borderBottomWidth: 0.9,
    borderColor: "#000000",
    alignItems: "center",
  },
  instructionsLabel: {
    width: "30%",
    paddingLeft: 26,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  instructionsText: {
    width: "70%",
    fontFamily: "Helvetica-Oblique",
    fontSize: 8.2,
    paddingLeft: 5,
    paddingRight: 5,
  },
  belowNote: {
    textAlign: "right",
    fontSize: 8.2,
    paddingRight: 7,
    paddingTop: 5,
    paddingBottom: 3,
  },
  supplierDetails: {
    flexDirection: "row",
    justifyContent: "flex-end",
    minHeight: 63,
    paddingRight: 8,
    paddingTop: 7,
    paddingBottom: 5,
  },
  supplierDetailsInner: {
    width: "43%",
  },
  supplierDetailLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 15,
  },
  supplierDetailLabel: {
    fontSize: 8,
  },
  supplierDetailUnderline: {
    flex: 1,
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    height: 11,
    marginLeft: 3,
  },
  footerText: {
    paddingLeft: 10,
    paddingRight: 10,
    fontSize: 8.1,
    lineHeight: 1.35,
  },
  footerLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 4,
    minHeight: 32,
  },
  canvasserLine: {
    width: "48%",
    textAlign: "center",
    borderBottomWidth: 0.75,
    borderColor: "#000000",
    paddingBottom: 2,
    fontSize: 8,
  },
  bidder: {
    width: "43%",
  },
});

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

function money(value: number) {
  return Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function RFQPDF({ rfq, items }: { rfq: RFQPdfData; items: RFQPdfItem[] }) {
  const logoSrc = typeof window !== "undefined" ? `${window.location.origin}/msu-logo.png` : "/msu-logo.png";
  const signer = rfq.template_type === "less_than_50k" ? "ENGR. NELSON P. BENARES, JR." : "RANDY P. ASTURIAS, D.Eng.";
  const signerRole = rfq.template_type === "less_than_50k" ? "Director, Procurement Management Office" : "BAC Chairman";
  const total = Number(rfq.total || 0) || items.reduce((sum, item) => sum + Number(item.total_cost || 0), 0);

  return (
    <Document title={`RFQ-${rfq.pr_no}`} author="Mindanao State University - General Santos City">
      <Page size="LETTER" style={styles.page}>
        <View style={styles.form}>
          <View style={styles.header}>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.university}>MINDANAO STATE UNIVERSITY</Text>
            <Text style={styles.locationLine}>Fatima, General Santos City</Text>
            <Text style={styles.title}>REQUEST FOR QUOTATION</Text>
          </View>

          <View style={styles.meta}>
            <View style={styles.leftMeta}>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>Company Name</Text><View style={styles.supplierUnderline} /></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}></Text><View style={styles.supplierUnderline} /></View>
              <View style={styles.supplierLine}><Text style={styles.supplierLabel}>Address</Text><View style={styles.supplierUnderline} /></View>
            </View>
            <View style={styles.rightMeta}>
              <View style={styles.line}><Text style={styles.lineLabel}>Reference Nos.</Text><Text style={styles.lineValue}>{rfq.reference_no}</Text></View>
              <View style={styles.line}><Text style={styles.lineLabel}>Project Name:</Text><Text style={styles.lineValue}>{rfq.project_name}</Text></View>
              <View style={styles.line}><Text style={styles.lineLabel}>Location:</Text><Text style={styles.lineValue}>{rfq.location || ""}</Text></View>
              <View style={styles.line}><Text style={styles.lineLabel}>Date :</Text><Text style={styles.lineValue}>{formatDate(rfq.rfq_date)}</Text></View>
              <View style={styles.line}><Text style={styles.lineLabel}>Quotation No. :</Text><Text style={styles.lineValue}></Text></View>
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

          <View style={styles.tableHeaderTop}>
            <View style={[styles.colItem, styles.headerCell]}><Text style={styles.headerText}>Item</Text></View>
            <View style={[styles.colQty, styles.headerCell]}><Text style={styles.headerText}>QTY</Text></View>
            <View style={[styles.colAbc, styles.headerCell]}><Text style={styles.headerText}>ABC</Text></View>
            <View style={[styles.colTech, styles.headerCell]}><Text style={styles.headerText}>Technical Specifications</Text></View>
            <View style={[styles.colUnit, styles.headerCell, { width: "20%" }]}><Text style={styles.headerText}>Unit Price</Text></View>
            <View style={[styles.colTotal, styles.headerCell]}><Text style={styles.headerText}>Total Amount</Text></View>
          </View>
          <View style={styles.tableHeaderBottom}>
            <View style={[styles.colItem, styles.headerCell]} />
            <View style={[styles.colQty, styles.headerCell]} />
            <View style={[styles.colAbc, styles.headerCell]} />
            <View style={[styles.colTech, styles.headerCell]} />
            <View style={[styles.colUnit, styles.headerCell, { width: "7%", borderRightWidth: 1.2 }]}><Text style={styles.headerText}>UNIT</Text></View>
            <View style={[styles.colUnitPrice, styles.headerCell]}><Text style={styles.headerText}>UNIT PRICE</Text></View>
            <View style={[styles.colTotal, styles.headerCell]}><Text style={styles.headerText}>TOTAL AMOUNT</Text></View>
          </View>
          <View style={{ flexDirection: "row", borderBottomWidth: 0.75, borderColor: "#000000", minHeight: 17, alignItems: "center" }}>
            <View style={[styles.colItem, { width: "30%" }]} />
            <View style={[styles.colQty, { width: "8%" }]} />
            <View style={[styles.colAbc, { width: "12%" }]} />
            <View style={[styles.colTech, { width: "30%" }]} />
            <View style={{ width: "20%", flexDirection: "row", borderRightWidth: 1.2, borderColor: "#000000", height: "100%" }}>
              <View style={{ width: "35%", borderRightWidth: 1.2, borderColor: "#000000" }} />
              <View style={{ width: "65%" }} />
            </View>
            <View style={[styles.colTotal, { width: "13%" }]} />
          </View>

          {(items.length ? items : [{ item_description: "", quantity: 0, unit: "", unit_cost: 0, total_cost: 0 }]).map((item, index) => (
            <View style={styles.row} key={`${item.item_description}-${index}`}>
              <View style={[styles.colItem, styles.cell]}><Text>{item.item_description}</Text></View>
              <View style={[styles.colQty, styles.cell, styles.cellCenter]}><Text>{item.quantity || ""}</Text></View>
              <View style={[styles.colAbc, styles.cell, styles.cellRight]}><Text>{item.total_cost ? money(item.total_cost) : ""}</Text></View>
              <View style={[styles.colTech, styles.cell]}><Text>{item.item_description}</Text></View>
              <View style={[styles.colUnit, styles.cell, styles.cellCenter]}><Text></Text></View>
              <View style={[styles.colUnitPrice, styles.cell, styles.cellRight]}><Text></Text></View>
              <View style={[styles.colTotal, styles.cell, styles.cellRight]}><Text></Text></View>
            </View>
          ))}

          <View style={styles.nothing}>
            <View style={[styles.colItem, { width: "30%", height: "100%" }]} />
            <View style={[styles.colQty, { width: "8%", height: "100%" }]} />
            <View style={[styles.colAbc, { width: "12%", height: "100%" }]} />
            <View style={[styles.colTech, { width: "30%", height: "100%", borderRightWidth: 1.2, borderColor: "#000000", justifyContent: "center" }]}><Text style={styles.nothingText}>***NOTHING FOLLOWS***</Text></View>
            <View style={[styles.colUnit, { width: "7%", height: "100%" }]} />
            <View style={[styles.colUnitPrice, { width: "13%", height: "100%" }]} />
            <View style={[styles.colTotal, { width: "13%", height: "100%" }]} />
          </View>

          <View style={styles.purposeRow}><Text style={styles.purposeLabel}>(Purpose)</Text><Text style={styles.purposeText}>{rfq.purpose}</Text></View>
          <View style={styles.purposeRow}><Text style={styles.purposeLabel}>(Office)</Text><Text style={styles.purposeText}>{rfq.office}</Text></View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL ABC</Text>
            <Text style={[styles.totalValue, styles.cellRight]}>{money(total)}</Text>
            <View style={styles.totalSpacer} />
          </View>

          <View style={styles.instructionsRow}>
            <Text style={styles.instructionsLabel}>Instructions:</Text>
            <Text style={styles.instructionsText}>See attached Specifications/important Instructions for items.</Text>
          </View>
          <Text style={styles.belowNote}>(Please provide complete information below)</Text>

          <View style={styles.supplierDetails}>
            <View style={styles.supplierDetailsInner}>
              <View style={styles.supplierDetailLine}><Text style={styles.supplierDetailLabel}>Delivery Period :</Text><View style={styles.supplierDetailUnderline} /></View>
              <View style={styles.supplierDetailLine}><Text style={styles.supplierDetailLabel}>Warranty:</Text><View style={styles.supplierDetailUnderline} /></View>
              <View style={styles.supplierDetailLine}><Text style={styles.supplierDetailLabel}>Price Validity :</Text><View style={styles.supplierDetailUnderline} /></View>
            </View>
          </View>

          <Text style={styles.footerText}>Unit Purchase/Job Order or a Contract is prepared and executed, this Quotation/Proposal shall be binding upon us. We understand that you are not bound to accept the lowest or any Proposal you may receive.</Text>
          <View style={{ height: 6 }} />
          <Text style={styles.footerText}>After having carefully read and accepted your General Conditions, I/We quote you on the item at prices noted above.</Text>
          <View style={styles.footerLine}>
            <Text style={styles.canvasserLine}>Signature over printed name of canvasser</Text>
            <View style={styles.bidder}>
              <Text style={{ borderBottomWidth: 0.75, borderColor: "#000000", width: "100%", height: 15 }} />
              <Text style={styles.footerText}>Signature over printed name of bidder</Text>
              <Text style={styles.footerText}>Tel. No. / Cellphone No.: __________</Text>
              <Text style={styles.footerText}>E-mail address: _____________________</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
