import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const TransactionItem = ({ store, amount, type, onPress }) => {
  const formatCurrency = (value) =>
    new Intl.NumberFormat('ko-KR').format(value) + '원';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>₩</Text>
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.storeText}>{store}</Text>
        {type && <Text style={styles.typeText}>{type}</Text>}
      </View>
      <Text style={styles.amountText}>{formatCurrency(amount)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  iconContainer: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#0064FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  detailsContainer: {
    flex: 1,
  },
  storeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  typeText: {
    fontSize: 12,
    color: '#B6B6B6',
    marginTop: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
});

export default TransactionItem;
