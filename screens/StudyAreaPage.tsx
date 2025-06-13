import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'StudyArea'>;

export default function StudyAreaPage({ route, navigation }: Props) {
  const { studyAreaId, projectId } = route.params;
  const [stratUnits, setStratUnits] = useState<{ id: string; label: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    fetchStratUnits();
  }, [route.params.studyAreaId]);

  const fetchStratUnits = async () => {
    try {
      const q = query(collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits'), orderBy('id'));
      const querySnapshot = await getDocs(q);
      const units = querySnapshot.docs.map(doc => ({ id: doc.data().id, label: doc.data().label }));
      setStratUnits(units);
    } catch (error) {
      console.error('Error fetching strat units:', error);
    }
  };

  const handleAddStratUnit = async () => {
    if (!labelInput.trim()) {
      Alert.alert('Error', 'Label is required');
      return;
    }

    const existingIds = stratUnits.map(u => parseInt(u.id));
    const base = parseInt(route.params.studyAreaId) * 100;
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : base + 1;

    try {
      await addDoc(collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits'), {
        id: String(nextId),
        label: labelInput.trim()
      });
      setModalVisible(false);
      setLabelInput('');
      fetchStratUnits();
    } catch (error) {
      console.error('Error adding strat unit:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Study Area: {route.params.studyAreaId}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>ID</Text>
        <Text style={styles.headerText}>Label</Text>
        <Text style={styles.headerText}></Text>
      </View>
      <FlatList
        data={stratUnits}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.rowText}>{item.id}</Text>
            <Text style={styles.rowText}>{item.label}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('StratUnit', { suId: item.id, projectId: route.params.projectId, studyAreaId: route.params.studyAreaId })}>
              <Ionicons name="chevron-forward" size={20} color="black" />
            </TouchableOpacity>
          </View>
        )}
      />
      <Button title="Add Strat Unit" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Strat Unit</Text>
          <TextInput
            placeholder="Label"
            value={labelInput}
            onChangeText={setLabelInput}
            style={styles.input}
          />
          <Button title="Create" onPress={handleAddStratUnit} />
          <Button title="Cancel" color="gray" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  header: { fontSize: 20, marginBottom: 10 },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderColor: '#000',
    backgroundColor: '#f2f2f2'
  },
  headerText: { fontWeight: 'bold', width: '30%' },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
  rowText: { width: '30%' },
  modalView: {
    margin: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: { fontSize: 18, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5
  }
});
