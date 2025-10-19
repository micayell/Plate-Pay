import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

const TransactionDetailModal = ({ visible, onClose, transaction }) => {
  if (!transaction) {
    return null;
  }

  const formatCurrency = (value) =>
    new Intl.NumberFormat('ko-KR').format(value) + '원';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.storeName}>{transaction.store}</Text>
          <Text style={styles.address}>{transaction.address}</Text>

          <Text style={styles.paymentTitle}>결제 내역</Text>
          <ScrollView style={styles.breakdownContainer}>
            {transaction.breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View>
                  <Text style={styles.breakdownItemText}>{item.item}</Text>
                  {item.type && (
                    <Text style={styles.breakdownType}>{item.type}</Text>
                  )}
                </View>
                <Text style={styles.breakdownAmountText}>
                  {formatCurrency(item.amount)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>일시</Text>
              <Text style={styles.detailValue}>{transaction.datetime}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>계좌별명</Text>
              <Text style={styles.detailValue}>{transaction.accountName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>차량번호</Text>
              <Text style={styles.detailValue}>{transaction.carNumber}</Text>
            </View>
            <View style={[styles.detailRow, { marginTop: 8 }]}>
              <Text style={styles.detailLabel}>총액</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(transaction.amount)}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
            <Text style={styles.confirmButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  address: {
    fontSize: 11,
    color: '#B6B6B6',
    marginBottom: 16,
  },
  paymentTitle: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  breakdownContainer: {
    width: '100%',
    marginBottom: 16,
    maxHeight: 120, // 스크롤이 필요한 경우를 대비
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F4F4F4',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  breakdownItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  breakdownType: {
    fontSize: 8,
    color: '#B6B6B6',
  },
  breakdownAmountText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000000',
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F3F3F3',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7A7A7A',
  },
  confirmButton: {
    backgroundColor: '#0064FF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 30,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TransactionDetailModal;
