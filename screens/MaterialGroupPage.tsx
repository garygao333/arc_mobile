import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert, 
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { UniversalSherdDatabase } from '../utils/universalDatabase';

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

      try {
        const projectCode = route.params.projectId.toUpperCase();
        
        await UniversalSherdDatabase.addManualSherd(
          {
            diagnosticType: diagnosticType,
            qualificationType: qualificationType,
            weight: parseFloat(weight),
            count: parseInt(count, 10),
          },
          {
            projectId: projectCode,
            studyAreaId: route.params.studyAreaId,
            stratUnitId: route.params.suId,
            containerId: route.params.containerId,
            objectGroupId: route.params.groupId,
          }
        );

        console.log('Successfully saved to universal database');
      } catch (universalError) {
        console.error('Error saving to universal database:', universalError);
      }

      setModalVisible(false);
      fetchObjectGroups();
      setWeight('');
      setCount('');
    } catch (error) {
      console.error('Error adding object:', error);
      Alert.alert("Error", "Failed to add object");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARC</Text>
      </View>

      {/* Group Info */}
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>Material Group: {route.params.groupId}</Text>
        {objectGroups.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={20} color="#2D0C57" />
              <Text style={styles.statText}>
                {objectGroups.reduce((sum, item) => sum + item.count, 0)} objects
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="scale-outline" size={20} color="#2D0C57" />
              <Text style={styles.statText}>
                {objectGroups.reduce((sum, item) => sum + item.weight, 0).toFixed(2)}g
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Object Groups</Text>
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            style={styles.addButton}
          >
            <AntDesign name="plus" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={{ flex: 2 }}>
              <Text style={styles.headerCell}>Diagnostic</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.headerCell}>Qualification</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.headerCell}>Count</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.headerCell}>Weight</Text>
            </View>
          </View>
          
          {/* Table Rows */}
          <ScrollView style={styles.tableBody}>
            {objectGroups.length > 0 ? (
              objectGroups.map((item, index) => (
                <View 
                  key={`${item.id}-${index}`}
                  style={[
                    styles.tableRow,
                    { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8F9FA' }
                  ]}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={styles.cell}>{item.diagnostic}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.cell}>{item.qualification}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.cell}>{item.count}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.cell}>{item.weight}g</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={48} color="#CED4DA" />
                <Text style={styles.emptyStateText}>No objects added yet</Text>
                <Text style={styles.emptyStateSubtext}>Use the + button to add a new object group</Text>
                <TouchableOpacity 
                  style={styles.addButtonLarge}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.addButtonText}>Add Object Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Add Object Group Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Object Group</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Diagnostic Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={diagnosticType}
                  onValueChange={setDiagnosticType}
                  style={styles.picker}
                >
                  <Picker.Item label="Rim" value="rim" />
                  <Picker.Item label="Base" value="base" />
                  <Picker.Item label="Body" value="body" />
                  <Picker.Item label="Foot" value="foot" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Qualification Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={qualificationType}
                  onValueChange={setQualificationType}
                  style={styles.picker}
                >
                  <Picker.Item label="ITS" value="its" />
                  <Picker.Item label="African" value="african" />
                  <Picker.Item label="Black Gloss" value="black_gloss" />
                  <Picker.Item label="Sardinian" value="sardinian" />
                  <Picker.Item label="Thin Wall" value="thin_wall" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (grams)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter weight in grams"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Count</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number of objects"
                keyboardType="number-pad"
                value={count}
                onChangeText={setCount}
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.createButton, (!weight || !count) && styles.disabledButton]} 
                onPress={handleAddObject}
                disabled={!weight || !count}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#2D0C57',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  projectInfo: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  projectName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1E6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statText: {
    marginLeft: 6,
    color: '#2D0C57',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginBottom: 16,
  },
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  cell: {
    fontSize: 14,
    color: '#212529',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#ADB5BD',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButtonLarge: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2D0C57',
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    color: '#212529',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    backgroundColor: '#F8F9FA',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
  },
  createButton: {
    backgroundColor: '#2D0C57',
  },
  cancelButtonText: {
    color: '#6C757D',
    fontWeight: '600',
    fontSize: 14,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.6,
  }
});