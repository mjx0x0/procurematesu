import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Register font for better rendering
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "https://fonts.gstatic.com/s/helvetica/v11/helvetica.woff2" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    borderBottom: "1px solid #ccc",
    paddingBottom: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
    paddingVertical: 2,
  },
  label: {
    width: 120,
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
  },
  value: {
    flex: 1,
    fontSize: 9,
  },
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "1px solid #ccc",
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#333",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottom: "1px solid #eee",
  },
  col1: { width: "35%", fontSize: 9 },
  col2: { width: "15%", fontSize: 9, textAlign: "center" },
  col3: { width: "15%", fontSize: 9, textAlign: "center" },
  col4: { width: "17%", fontSize: 9, textAlign: "right" },
  col5: { width: "18%", fontSize: 9, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 6,
    borderTop: "1px solid #666",
  },
  totalLabel: {
    width: "82%",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
  },
  totalValue: {
    width: "18%",
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "right",
    color: "#2563eb",
  },
  signatureRow: {
    flexDirection: "row",
    marginTop: 30,
    paddingTop: 20,
    borderTop: "1px solid #ccc",
  },
  signatureBox: {
    width: "50%",
  },
  signatureLabel: {
    fontSize: 9,
    color: "#666",
    marginBottom: 20,
  },
  signatureLine: {
    borderBottom: "1px solid #333",
    width: "80%",
    marginBottom: 2,
  },
  signatureName: {
    fontSize: 9,
    marginBottom: 2,
  },
  signatureDesignation: {
    fontSize: 8,
    color: "#666",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTop: "1px solid #eee",
    paddingTop: 10,
  },
});

interface PRPDFProps {
  pr: {
    pr_no: string;
    department: string;
    purpose: string;
    total: number;
    current_stage: string;
    printed_name: string;
    designation: string;
    pr_date: string;
    created_at: string;
  };
  items: Array<{
    item_description: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    total_cost: number;
  }>;
}

export default function PRPDF({ pr, items }: PRPDFProps) {
  const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PURCHASE REQUEST</Text>
          <Text style={styles.subtitle}>Mindanao State University – General Santos City</Text>
          <Text style={[styles.subtitle, { fontSize: 9, marginTop: 4 }]}>
            PR No: {pr.pr_no} | Date: {pr.pr_date || new Date(pr.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Department & Purpose */}
        <View style={styles.row}>
          <Text style={styles.label}>Department:</Text>
          <Text style={styles.value}>{pr.department}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Purpose:</Text>
          <Text style={styles.value}>{pr.purpose}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.col1]}>Item Description</Text>
            <Text style={[styles.tableHeaderText, styles.col2]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.col3]}>Unit</Text>
            <Text style={[styles.tableHeaderText, styles.col4]}>Unit Cost</Text>
            <Text style={[styles.tableHeaderText, styles.col5]}>Total</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.col1}>{item.item_description}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col3}>{item.unit || "pcs"}</Text>
              <Text style={styles.col4}>₱{item.unit_cost.toFixed(2)}</Text>
              <Text style={styles.col5}>₱{item.total_cost.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>₱{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Requested By:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>{pr.printed_name || "_____________"}</Text>
            <Text style={styles.signatureDesignation}>{pr.designation || "Designation"}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Approved By:</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureName}>___________________</Text>
            <Text style={styles.signatureDesignation}>Chancellor / Authorized Representative</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This is a system-generated document. For official use only.
          {"\n"}Generated on {new Date().toLocaleString("en-PH")}
        </Text>
      </Page>
    </Document>
  );
}