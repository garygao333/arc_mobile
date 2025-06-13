// screens/ProjectPage.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc } from 'firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'Project'>;

export default function ProjectPage({ route, navigation }: Props) {
  const [studyAreas, setStudyAreas] = useState<{ id: string; label: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    fetchStudyAreas();
  }, [route.params.projectId]);

  const fetchStudyAreas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects', route.params.projectId, 'studyAreas'));
      const areas = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setStudyAreas(areas);
    } catch (error) {
      console.error('Error fetching study areas:', error);
    }
  };

  const handleAddStudyArea = async () => {
    if (!labelInput.trim()) {
      Alert.alert('Error', 'Label is required');
      return;
    }

    const existingIds = studyAreas.map(a => parseInt(a.id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1000 : 1000;
    const newId = String(nextId).padStart(5, '0');

    try {
      await addDoc(collection(db, 'projects', route.params.projectId, 'studyAreas'), {
        id: newId,
        label: labelInput.trim()
      });
      setModalVisible(false);
      setLabelInput('');
      fetchStudyAreas();
    } catch (error) {
      console.error('Error adding study area:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Project ID: {route.params.projectId}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>ID</Text>
        <Text style={styles.headerText}>Label</Text>
        <Text style={styles.headerText}></Text>
      </View>
      <FlatList
        data={studyAreas}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.rowText}>{item.id}</Text>
            <Text style={styles.rowText}>{item.label}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('StudyArea', {   studyAreaId: item.id,   projectId: route.params.projectId })}>
              <Ionicons name="chevron-forward" size={20} color="black" />
            </TouchableOpacity>
          </View>
        )}
      />
      <Button title="Add Study Area" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Study Area</Text>
          <TextInput
            placeholder="Label"
            value={labelInput}
            onChangeText={setLabelInput}
            style={styles.input}
          />
          <Button title="Create" onPress={handleAddStudyArea} />
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