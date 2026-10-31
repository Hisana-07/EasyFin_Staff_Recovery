import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { apiGet } from '../api';

const money = (n) =>
  '\u20B9' + String(Math.round(Number(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function CaseDetailScreen({ route }) {
  const { id } = route.params;
  const [item, setItem] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/cases/${id}`)
      .then((d) => setItem(d.caseItem))
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  }
  if (!item) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a56db" /></View>;
  }

  const { customer, loan } = item;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.dueBox}>
        <Text style={styles.dueLabel}>Amount to be collected</Text>
        <Text style={styles.dueAmount}>{money(loan.overdueAmount)}</Text>
        <Text style={styles.dueDays}>{loan.overdueDays} days overdue</Text>
      </View>

      <Text style={styles.sectionTitle}>Loan details</Text>
      <View style={styles.card}>
        <Row label="Loan ID" value={loan.loanId} />
        <Row label="Type" value={loan.loanType} />
        <Row label="Total loan" value={money(loan.totalAmount)} />
        <Row label="Outstanding" value={money(loan.outstandingAmount)} />
        <Row label="Overdue" value={money(loan.overdueAmount)} />
        <Row label="EMI" value={money(loan.emiAmount)} />
        <Row label="Status" value={loan.status} />
      </View>

      <Text style={styles.sectionTitle}>Customer</Text>
      <View style={styles.card}>
        <Row label="Name" value={customer.name} />
        <Row label="Phone" value={customer.phone} />
        <Row label="Address" value={customer.address} />
        <Row label="Landmark" value={customer.landmark || '-'} />
        <Row label="City" value={customer.city} />
      </View>

      {item.notes ? (
        <>
          <Text style={styles.sectionTitle}>Notes</Text>
          <View style={styles.card}><Text>{item.notes}</Text></View>
        </>
      ) : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => Alert.alert('Start Recovery', 'This is built in the next step.')}
      >
        <Text style={styles.buttonText}>Start Recovery</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#c00', textAlign: 'center' },
  dueBox: { backgroundColor: '#1a56db', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 8 },
  dueLabel: { color: '#dbe7ff' },
  dueAmount: { color: '#fff', fontSize: 34, fontWeight: 'bold', marginVertical: 4 },
  dueDays: { color: '#dbe7ff' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#666', flex: 1 },
  rowValue: { fontWeight: '500', flex: 2, textAlign: 'right' },
  button: { backgroundColor: '#15803d', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24, marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});