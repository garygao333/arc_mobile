import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';

export default function MaterialGroupPage({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'MaterialGroup'>) {
  const [objectGroups, setObjectGroups] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [diagnosticType, setDiagnosticType] = useState('rim');
  const [qualificationType, setQualificationType] = useState('its');
  const [weight, setWeight] = useState('');
  const [count, setCount] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchObjectGroups();
    }, [])
  );

  const fetchObjectGroups = async () => {
    try {
      const q = query(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'containers', route.params.containerId,
        'groups', route.params.groupId,
        'objects'
      ), orderBy('diagnostic'));
      const querySnapshot = await getDocs(q);
      const objects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setObjectGroups(objects);
    } catch (error) {
      console.error('Error fetching object groups:', error);
    }
  };

  const handleAddObject = async () => {
    try {
      await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'containers', route.params.containerId,
        'groups', route.params.groupId,
        'objects'
      ), {
        diagnostic: diagnosticType,
        qualification: qualificationType,
        weight: parseFloat(weight),
        count: parseInt(count, 10)
      });
      setModalVisible(false);
      fetchObjectGroups();
      setWeight('');
      setCount('');
    } catch (error) {
      console.error('Error adding object:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Material Group: {route.params.groupId}</Text>
        {objectGroups.length > 0 && (
          <Text style={styles.subtitle}>
            Total Objects: {objectGroups.reduce((sum, item) => sum + item.count, 0)} | 
            Total Weight: {objectGroups.reduce((sum, item) => sum + item.weight, 0).toFixed(2)}g
          </Text>
        )}
      </View>

      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>Diagnostic</Text>
        <Text style={styles.headerText}>Qualification</Text>
        <Text style={styles.headerText}>Count</Text>
        <Text style={styles.headerText}>Weight</Text>
      </View>

      <FlatList
        data={objectGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.rowText}>{item.diagnostic}</Text>
            <Text style={styles.rowText}>{item.qualification}</Text>
            <Text style={styles.rowText}>{item.count}</Text>
            <Text style={styles.rowText}>{item.weight}g</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No objects added yet</Text>
            <Text style={styles.emptySubtext}>Use "Add Object Group" to create entries</Text>
          </View>
        }
      />

      <View style={styles.buttonContainer}>
        <Button title="Add Object Group" onPress={() => setModalVisible(true)} />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Add Object Group</Text>

          <Text style={styles.label}>Diagnostic Type</Text>
          <Picker selectedValue={diagnosticType} onValueChange={setDiagnosticType} style={styles.picker}>
            <Picker.Item label="Rim" value="rim" />
            <Picker.Item label="Base" value="base" />
            <Picker.Item label="Body" value="body" />
            <Picker.Item label="Foot" value="foot" />
          </Picker>

          <Text style={styles.label}>Qualification Type</Text>
          <Picker selectedValue={qualificationType} onValueChange={setQualificationType} style={styles.picker}>
            <Picker.Item label="ITS" value="its" />
            <Picker.Item label="African" value="african" />
            <Picker.Item label="Black Gloss" value="black_gloss" />
            <Picker.Item label="Sardinian" value="sardinian" />
            <Picker.Item label="Thin Wall" value="thin_wall" />
          </Picker>

          <TextInput
            style={styles.input}
            placeholder="Weight (grams)"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <TextInput
            style={styles.input}
            placeholder="Count"
            keyboardType="number-pad"
            value={count}
            onChangeText={setCount}
          />

          <View style={styles.modalButtons}>
            <Button title="Create" onPress={handleAddObject} />
            <Button title="Cancel" color="gray" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  headerContainer: {
    marginBottom: 15
  },
  header: { 
    fontSize: 20, 
    fontWeight: 'bold',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  tableHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 8, 
    borderBottomWidth: 2, 
    borderColor: '#000', 
    backgroundColor: '#f2f2f2',
    borderRadius: 5
  },
  headerText: { 
    fontWeight: 'bold', 
    width: '25%',
    textAlign: 'center'
  },
  tableRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginVertical: 1,
    borderRadius: 3
  },
  rowText: { 
    width: '25%',
    textAlign: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5
  },
  buttonContainer: {
    paddingTop: 20
  },
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
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 10
  },
  input: {
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 10, 
    marginBottom: 10, 
    borderRadius: 5
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15
  }
});