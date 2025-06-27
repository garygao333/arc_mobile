import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, doc, getDoc, where } from 'firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'StudyArea'>;

export default function StudyAreaPage({ route, navigation }: Props) {
  // Ensure we have the required params
  const { studyAreaId, projectId } = route.params || {};
  const [studyArea, setStudyArea] = useState<{id: string, label: string, description?: string} | null>(null);
  const [stratUnits, setStratUnits] = useState<{ id: string; typology: string; label: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [stratUnitId, setStratUnitId] = useState('');
  const [typologyInput, setTypologyInput] = useState('');
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    if (!studyAreaId || !projectId) {
      console.error('Missing required parameters');
      Alert.alert('Error', 'Missing required parameters');
      return;
    }

    const loadData = async () => {
      try {
        await fetchStudyArea();
        await fetchStratUnits();
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert('Error', 'Failed to load study area data');
      }
    };
    
    loadData();
  }, [studyAreaId, projectId]);

  const fetchStudyArea = async () => {
    console.log('Fetching study area with ID:', studyAreaId);
    try {
      // First try to fetch by document ID
      const studyAreaRef = doc(db, 'projects', projectId, 'studyAreas', studyAreaId);
      console.log('Study area ref:', studyAreaRef.path);
      
      const studyAreaDoc = await getDoc(studyAreaRef);
      console.log('Study area doc exists:', studyAreaDoc.exists());
      
      if (studyAreaDoc.exists()) {
        const data = studyAreaDoc.data();
        const studyAreaData = {
          id: studyAreaDoc.id,
          // Handle different possible field names
          label: data?.label || data?.name || data?.title || 'Unlabeled Study Area',
          description: data?.description || data?.desc || ''
        };
        console.log('Fetched study area:', studyAreaData);
        setStudyArea(studyAreaData);
        return;
      }
      
      // If not found by ID, try to find by ID field
      console.log('Trying to find study area by ID field...');
      const q = query(
        collection(db, 'projects', projectId, 'studyAreas'),
        where('id', '==', studyAreaId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        const studyAreaData = {
          id: doc.id,
          label: data?.label || data?.name || data?.title || 'Unlabeled Study Area',
          description: data?.description || data?.desc || ''
        };
        console.log('Found study area by ID field:', studyAreaData);
        setStudyArea(studyAreaData);
      } else {
        console.warn('Study area not found by ID or ID field');
        // Create a minimal study area object to allow the page to render
        setStudyArea({
          id: studyAreaId,
          label: `Study Area ${studyAreaId}`,
          description: 'No additional information available'
        });
      }
    } catch (error) {
      console.error('Error fetching study area:', error);
      Alert.alert('Error', 'Failed to load study area');
      throw error; // Re-throw to be caught by the caller
    }
  };

  const fetchStratUnits = async () => {
    console.log('Fetching strat units for study area:', studyAreaId);
    try {
      const stratUnitsRef = collection(db, 'projects', projectId, 'studyAreas', studyAreaId, 'stratUnits');
      console.log('Strat units collection path:', stratUnitsRef.path);
      
      const q = query(stratUnitsRef, orderBy('id'));
      const querySnapshot = await getDocs(q);
      
      console.log('Found', querySnapshot.size, 'strat units');
      const units = querySnapshot.docs.map(doc => ({
        id: doc.data()?.id || 'unknown',
        typology: doc.data()?.typology || doc.data()?.label || 'Unspecified',
        label: doc.data()?.label === doc.data()?.typology ? '' : (doc.data()?.label || '')
      }));
      
      console.log('Fetched strat units:', units);
      setStratUnits(units);
    } catch (error) {
      console.error('Error fetching strat units:', error);
      Alert.alert('Error', 'Failed to load stratigraphic units');
      throw error; // Re-throw to be caught by the caller
    }
  };

  // Generate a new strat unit ID when the modal opens
  const openStratUnitModal = () => {
    const existingIds = stratUnits.map(u => parseInt(u.id));
    const base = parseInt(studyAreaId) * 100;
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : base + 1;
    setStratUnitId(String(nextId));
    setModalVisible(true);
  };

  const handleAddStratUnit = async () => {
    if (!stratUnitId) {
      Alert.alert('Error', 'Stratigraphic Unit ID is required');
      return;
    }

    if (!typologyInput.trim()) {
      Alert.alert('Error', 'Typology is required');
      return;
    }

    if (!studyAreaId || !projectId) {
      Alert.alert('Error', 'Missing required parameters');
      return;
    }

    // Validate strat unit ID format (must be a number)
    if (!/^\d+$/.test(stratUnitId)) {
      Alert.alert('Error', 'Stratigraphic Unit ID must be a number');
      return;
    }

    // Check if ID already exists
    if (stratUnits.some(unit => unit.id === stratUnitId)) {
      Alert.alert('Error', 'A stratigraphic unit with this ID already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'projects', projectId, 'studyAreas', studyAreaId, 'stratUnits'), {
        id: stratUnitId,
        typology: typologyInput.trim(),
        label: labelInput.trim()
      });
      
      setModalVisible(false);
      setStratUnitId('');
      setTypologyInput('');
      setLabelInput('');
      fetchStratUnits();
    } catch (error) {
      console.error('Error adding strat unit:', error);
      Alert.alert('Error', 'Failed to add stratigraphic unit');
    }
  };

  if (!studyAreaId || !projectId) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.errorText}>Error: Missing required parameters</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!studyArea) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <View style={{ alignItems: 'center' }}>
          <Text>Loading study area...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARC</Text>
      </View>

      {/* Study Area Info */}
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>Study Area {String(studyAreaId).padStart(5, '0')}</Text>
        <Text style={styles.projectCode}>{studyArea.label}</Text>
        {studyArea.description && (
          <Text style={styles.projectDescription}>{studyArea.description}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Stratigraphic Units</Text>
          <TouchableOpacity onPress={openStratUnitModal} style={styles.addButton}>
            <AntDesign name="plus" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={{ width: 80, marginRight: 15 }}>
              <Text style={styles.headerCell}>ID</Text>
            </View>
            <View style={{ flex: 3, marginRight: 15 }}>
              <Text style={styles.headerCell}>Typology</Text>
            </View>
            <View style={{ flex: 3, marginRight: 15 }}>
              <Text style={styles.headerCell}>Short description</Text>
            </View>
            <View style={{ width: 30, alignItems: 'flex-end' }}>
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </View>
          </View>

          {/* Table Rows */}
          <ScrollView style={styles.tableBody}>
            {stratUnits.map((unit, index) => (
              <TouchableOpacity
                key={`${unit.id}-${index}`}
                style={[
                  styles.tableRow,
                  { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8F9FA' }
                ]}
                onPress={() => {
                  // Navigate to MaterialContainerPage with the strat unit's ID as containerId
                  navigation.navigate('MaterialContainer', {
                    projectId,
                    studyAreaId,
                    suId: unit.id,
                    containerId: unit.id // Using strat unit ID as container ID for now
                  });
                }}
              >
                <View style={{ width: 80, justifyContent: 'center', marginRight: 15 }}>
                  <Text style={[styles.cell, { fontWeight: '500' }]}>{unit.id}</Text>
                </View>
                <View style={{ flex: 3, justifyContent: 'center', marginRight: 15 }}>
                  <Text style={styles.cell} numberOfLines={2} ellipsizeMode="tail">
                    {unit.typology || '—'}
                  </Text>
                </View>
                <View style={{ flex: 3, justifyContent: 'center', marginRight: 15 }}>
                  <Text style={[styles.cell, { color: unit.label ? '#000' : '#999' }]} numberOfLines={2} ellipsizeMode="tail">
                    {unit.label || '—'}
                  </Text>
                </View>
                <View style={{ width: 30, alignItems: 'flex-end' }}>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </View>
              </TouchableOpacity>
            ))}
            {stratUnits.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#666', fontSize: 16 }}>No stratigraphic units found</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Add Strat Unit Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Stratigraphic Unit</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stratigraphic Unit ID</Text>
                <TextInput
                  placeholder="e.g., 1001"
                  value={stratUnitId}
                  onChangeText={setStratUnitId}
                  style={styles.modalInput}
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Typology</Text>
                <TextInput
                  placeholder="Typology"
                  value={typologyInput}
                  onChangeText={setTypologyInput}
                  style={styles.modalInput}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Short description</Text>
                <TextInput
                  placeholder="Short description"
                  value={labelInput}
                  onChangeText={setLabelInput}
                  style={styles.modalInput}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={() => {
                    setModalVisible(false);
                    setStratUnitId('');
                    setTypologyInput('');
                    setLabelInput('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.createButton]} 
                  onPress={handleAddStratUnit}
                  disabled={!typologyInput.trim()}
                >
                  <Text style={[styles.createButtonText, !typologyInput.trim() && { opacity: 0.5 }]}>
                    Create
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    backgroundColor: '#2D0C57',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  headerLogo: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  projectInfo: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  projectName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  projectCode: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  projectDescription: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerCell: {
    fontWeight: '600',
    color: '#444',
    fontSize: 14,
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  cell: {
    fontSize: 16,
    color: '#333',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  createButton: {
    backgroundColor: '#2D0C57',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  }
});
