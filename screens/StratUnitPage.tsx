import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons, AntDesign } from '@expo/vector-icons';
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARC</Text>
      </View>

      {/* Strat Unit Info */}
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>Strat Unit: {route.params.suId}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Material Containers</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <AntDesign name="plus" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerCell}>ID</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.headerCell}>Label</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
          
          {/* Table Rows */}
          <ScrollView style={styles.tableBody}>
            {containers.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                style={[
                  styles.tableRow,
                  { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8F9FA' }
                ]}
                onPress={() => navigation.navigate('MaterialContainer', { 
                  containerId: item.id, 
                  projectId: route.params.projectId, 
                  studyAreaId: route.params.studyAreaId, 
                  suId: route.params.suId 
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cell}>{item.id}</Text>
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.cell}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
            {containers.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No material containers yet</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Add Material Container Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Material Container</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Material Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={labelInput}
                  onValueChange={setLabelInput}
                  style={styles.picker}
                >
                  <Picker.Item label="Pottery" value="Pottery" />
                  <Picker.Item label="Lithics" value="Lithics" />
                  <Picker.Item label="Fauna" value="Fauna" />
                  <Picker.Item label="Botanical" value="Botanical" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.createButton]} 
                onPress={handleAddContainer}
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
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectCode: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
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
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#6C757D',
    fontSize: 16,
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
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#6C757D',
  },
  createButtonText: {
    color: 'white',
  }
});
