import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Car } from '../../../types/type';
import { getMyCars, deleteCar, updateCarNickname } from '../../../shared/api/carApi';
import AppHeader from '../../../shared/ui/AppHeader';

const RegistrationContent = ({ navigation }) => (
  <>
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => navigation.navigate('VehicleRegistration')}
    >
      <Text style={styles.addButtonText}>+ 새 차량 등록</Text>
    </TouchableOpacity>
    <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>차량 등록 안내</Text>
      <Text style={styles.infoText}>• 한 명의 사용자가 여러 차량을 등록할 수 있습니다</Text>
      <Text style={styles.infoText}>• 동일한 차량 번호는 한 명만 등록 가능합니다</Text>
    </View>
  </>
);

const VehicleScreen = ({ navigation }) => {
  const [vehicles, setVehicles] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Car | null>(null);
  const [newNickname, setNewNickname] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchVehicles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyCars();
      setVehicles(data);
    } catch (err) {
      setError('차량 목록을 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchVehicles();
    }, []),
  );

  const handleDeletePress = (vehicle: Car) => {
    setSelectedVehicle(vehicle);
    setDeleteModalVisible(true);
  };

  const handleEditNicknamePress = (vehicle: Car) => {
    setSelectedVehicle(vehicle);
    setNewNickname(vehicle.nickName);
    setEditModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedVehicle) {
      setIsDeleting(true);
      try {
        await deleteCar(selectedVehicle.carUid);
        await fetchVehicles();
        Alert.alert('성공', '차량이 삭제되었습니다.');
      } catch (err) {
        Alert.alert('오류', '차량 삭제에 실패했습니다.');
      } finally {
        setIsDeleting(false);
        setDeleteModalVisible(false);
        setSelectedVehicle(null);
      }
    }
  };

  const handleConfirmEditNickname = async () => {
    if (selectedVehicle && newNickname.trim()) {
      setIsEditing(true);
      try {
        await updateCarNickname(selectedVehicle.carUid, newNickname.trim());
        await fetchVehicles();
        Alert.alert('성공', '차량 별명이 변경되었습니다.');
      } catch (err) {
        Alert.alert('오류', '별명 변경에 실패했습니다.');
      } finally {
        setIsEditing(false);
        setEditModalVisible(false);
        setSelectedVehicle(null);
        setNewNickname('');
      }
    } else {
      Alert.alert('오류', '새로운 별명을 입력해주세요.');
    }
  };

  const renderVehicle = ({ item }: { item: Car }) => (
    <View style={styles.carCard}>
      <Image source={{ uri: item.imgUrl }} style={styles.carImage} />
      <TouchableOpacity onPress={() => handleEditNicknamePress(item)} style={styles.editButton}>
        <Icon name="edit" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.infoContainer}>
        <View>
          <Text style={styles.carNickname}>{item.nickName}</Text>
          <Text style={styles.plateNumber}>{item.plateNum}</Text>
          <Text style={styles.carModel}>{item.carModel}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeletePress(item)}>
          <Icon name="trash-o" size={24} color="#343330" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="차량" rightType="profile" rightNavigateTo="ProfileStack" />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text>{error}</Text>
        </View>
      ) : vehicles.length === 0 ? (
        // ✅ 빈 리스트일 때: 상단 여백 없이 바로 버튼/안내 노출
        <View style={styles.listContainerCompact}>
          <RegistrationContent navigation={navigation} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {vehicles.map(item => (
            <View key={item.carUid}>{renderVehicle({ item })}</View>
          ))}
          <RegistrationContent navigation={navigation} />
        </ScrollView>
      )}

      {/* 삭제 모달 */}
      <Modal animationType="fade" transparent visible={isDeleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>삭제하시겠습니까?</Text>
            <Text style={styles.modalSubtitle}>이 작업은 되돌릴 수 없습니다</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, isDeleting && styles.buttonDisabled]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.deleteButtonText}>삭제</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 수정 모달 */}
      <Modal animationType="fade" transparent visible={isEditModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>별명 변경</Text>
            <TextInput
              style={styles.nicknameInput}
              value={newNickname}
              onChangeText={setNewNickname}
              placeholder="새로운 별명을 입력하세요"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, isEditing && styles.buttonDisabled]}
                onPress={handleConfirmEditNickname}
                disabled={isEditing}
              >
                {isEditing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmButtonText}>확인</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  listContainer: { padding: 20 },
  // ✅ 빈 목록용: flex 주지 않고 padding만 — 위 빈 공간 없음
  listContainerCompact: { padding: 20 },

  // 로딩/에러 박스는 가운데 정렬 유지
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  carCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  carImage: { width: '100%', height: 184 },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: 8,
    borderRadius: 20,
  },
  infoContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  carNickname: { fontSize: 20, fontWeight: 'bold', color: '#1A365D', marginBottom: 4 },
  plateNumber: { fontSize: 16, color: '#1A365D', marginBottom: 4 },
  carModel: { fontSize: 12, color: '#61616B' },

  addButton: { backgroundColor: '#0064FF', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  infoBox: { borderWidth: 1, borderColor: '#1A3366', backgroundColor: '#F0FAFF', borderRadius: 8, padding: 15 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#1A3366', marginBottom: 10 },
  infoText: { fontSize: 11, color: '#61616B', lineHeight: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20, width: '85%', alignItems: 'center' },
  nicknameInput: { width: '100%', borderBottomWidth: 1, borderColor: '#CCC', padding: 10, marginBottom: 25, fontSize: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 25, textAlign: 'center' },
  modalButtonContainer: { flexDirection: 'row', width: '100%' },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CCC', marginRight: 10 },
  cancelButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  confirmButton: { backgroundColor: '#007AFF' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { backgroundColor: '#A9A9A9' },
});

export default VehicleScreen;
