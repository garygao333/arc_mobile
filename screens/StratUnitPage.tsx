import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';

export default function StratUnitPage({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'StratUnit'>) {
  const [containers, setContainers] = useState<{ id: string; label: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [labelInput, setLabelInput] = useState('Pottery');

  useEffect(() => {
    fetchContainers();
  }, [route.params.suId]);

  const fetchContainers = async () => {
    try {
      const q = query(collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'containers'), orderBy('id'));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.data().id, label: doc.data().label }));
      setContainers(items);
    } catch (error) {
      console.error('Error fetching containers:', error);
    }
  };

  const handleAddContainer = async () => {
    const existingIds = containers.map(c => c.id);
    let nextLetter = 'A';
    while (existingIds.includes(`${route.params.suId}-${nextLetter}`)) {
      nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
    }
    const newId = `${route.params.suId}-${nextLetter}`;
    try {
      await addDoc(collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'containers'), {
        id: newId,
        label: labelInput
      });
      setModalVisible(false);
      fetchContainers();
    } catch (error) {
      console.error('Error adding container:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Strat Unit: {route.params.suId}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>ID</Text>
        <Text style={styles.headerText}>Label</Text>
        <Text style={styles.headerText}></Text>
      </View>
      <FlatList
        data={containers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.rowText}>{item.id}</Text>
            <Text style={styles.rowText}>{item.label}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MaterialContainer', { containerId: item.id, projectId: route.params.projectId, studyAreaId: route.params.studyAreaId, suId: route.params.suId })}>
              <Ionicons name="chevron-forward" size={20} color="black" />
            </TouchableOpacity>
          </View>
        )}
      />
      <Button title="Add Material Container" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Material Container</Text>
          <Text style={{ marginBottom: 10 }}>Type</Text>
          {/* <TextInput
            value={labelInput}
            editable={false}
            style={[styles.input, { backgroundColor: '#eee' }]}
          /> */}
          <Text>Material Container Type</Text>
          <Picker selectedValue={labelInput} onValueChange={setLabelInput}>
            <Picker.Item label="Pottery" value="fine-ware" />
          </Picker>
          <Button title="Create" onPress={handleAddContainer} />
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
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 2, borderColor: '#000', backgroundColor: '#f2f2f2'
  },
  headerText: { fontWeight: 'bold', width: '30%' },
  tableRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: '#ccc',
  },
  rowText: { width: '30%' },
  modalView: {
    margin: 40, padding: 20, backgroundColor: 'white', borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 5
  },
  modalTitle: { fontSize: 18, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 5
  }
});
