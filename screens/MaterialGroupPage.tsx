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

// Format material type for display
const formatMaterialTypeLabel = (type: string): string => {
  const mapping: Record<string, string> = {
    'fine-ware': 'Fine Ware',
    'coarse-ware': 'Coarse Ware',
    'cooking-ware': 'Cooking Ware',
    'amphora': 'Amphora',
    'lamp': 'Lamp'
  };
  return mapping[type] || type;
};

// Format part type to display with consistent capitalization
const formatPartTypeLabel = (value: string): string => {
  const partTypeMapping: Record<string, string> = {
    'body': 'Body',
    'Body': 'Body',
    'rim': 'Rim',
    'Rim': 'Rim',
    'base': 'Base',
    'Base': 'Base',
    'foot': 'Foot',
    'Foot': 'Foot',
    'handle': 'Handle',
    'Handle': 'Handle',
    'spout': 'Spout',
    'Spout': 'Spout',
    'lamp': 'Lamp',
    'Lamp': 'Lamp'
  };
  return partTypeMapping[value] || value;
};

// Format qualification value to display label
const formatQualificationLabel = (value: string, materialType: string): string => {
  const coarseWareMapping: Record<string, string> = {
    'Unidentified': 'Unidentified',
    'Punic': 'Punic',
    'unidentified': 'Unidentified',
    'punic': 'Punic'
  };
  
  const fineWareMapping: Record<string, string> = {
    'ITS': 'ITS',
    'its': 'ITS',
    'African sigillata': 'African sigillata',
    'african': 'African sigillata',
    'Black gloss': 'Black gloss',
    'black_gloss': 'Black gloss',
    'Sardinian black gloss': 'Sardinian black gloss',
    'sardinian': 'Sardinian black gloss',
    'Thin wall': 'Thin wall',
    'thin_wall': 'Thin wall'
  };
  
  if (materialType === 'coarse-ware') {
    return coarseWareMapping[value] || value;
  } else {
    return fineWareMapping[value] || value;
  }
};
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, doc, updateDoc, increment, getDoc, setDoc } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { UniversalSherdDatabase } from '../utils/universalDatabase';

type MaterialGroupRouteParams = {
  projectId: string;
  studyAreaId: string;
  suId: string;
  containerId: string;
  groupId: string;
  materialType: 'fine-ware' | 'coarse-ware' | 'cooking-ware' | 'amphora' | 'lamp';
  materialId?: string;
};

export default function MaterialGroupPage({ route, navigation }: { route: { params: MaterialGroupRouteParams }, navigation: any }) {
  const [objectGroups, setObjectGroups] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [diagnosticType, setDiagnosticType] = useState('rim');
  const [qualificationType, setQualificationType] = useState('');
  const [weight, setWeight] = useState('');
  const [count, setCount] = useState('');
  
  // Get material type and ID from route params and set default qualification type
  const materialType = route.params.materialType || 'fine-ware';
  const materialId = route.params.materialId || '';
  
  // Set default qualification type based on material type
  React.useEffect(() => {
    if (materialType === 'coarse-ware') {
      setQualificationType('Unidentified');
    } else {
      setQualificationType('ITS');
    }
  }, [materialType]);
  
  // Qualification type options based on material type
  const qualificationOptions = materialType === 'coarse-ware' 
    ? [
        { label: 'unidentified', value: 'Unidentified' },
        { label: 'punic', value: 'Punic' }
      ]
    : [
        { label: 'its', value: 'ITS' },
        { label: 'african', value: 'African sigillata' },
        { label: 'black_gloss', value: 'Black gloss' },
        { label: 'sardinian', value: 'Sardinian black gloss' },
        { label: 'thin_wall', value: 'Thin wall' }
      ];

  useFocusEffect(
    React.useCallback(() => {
      fetchObjectGroups();
    }, [])
  );

  const fetchObjectGroups = async () => {
    try {
      console.log('Fetching object groups for material group:', route.params.groupId);
      const objectsRef = collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'materialGroups', route.params.groupId,
        'objects'
      );
      
      // First, try without ordering to verify we can get any data
      const querySnapshot = await getDocs(objectsRef);
      console.log('Found', querySnapshot.size, 'objects');
      
      // Log the first document to see its structure
      if (querySnapshot.size > 0) {
        console.log('First object data:', querySnapshot.docs[0].data());
      }
      
      const objects = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Make sure we have all required fields with defaults
        diagnosticType: doc.data().diagnosticType || 'unknown',
        qualificationType: doc.data().qualificationType || 'unknown',
        weight: doc.data().weight || 0,
        createdAt: doc.data().createdAt || new Date().toISOString()
      }));
      
      console.log('Processed objects:', objects);
      setObjectGroups(objects);
    } catch (error) {
      console.error('Error fetching object groups:', error);
      Alert.alert('Error', 'Failed to load objects. Please try again.');
      Alert.alert('Error', 'Failed to load object groups');
    }
  };

  const handleAddObject = async () => {
    console.log('Starting handleAddObject');
    if (!weight || isNaN(parseFloat(weight)) || !count || isNaN(parseInt(count, 10))) {
      const errorMsg = 'Please enter valid weight and count values';
      console.error(errorMsg, { weight, count });
      Alert.alert('Error', errorMsg);
      return;
    }

    const weightValue = parseFloat(weight);
    const countValue = parseInt(count, 10);
    const now = new Date();

    try {
      // First, ensure the material group exists
      // Create the document reference using nested collection() and doc() calls
      const groupRef = doc(
        collection(
          doc(
            collection(
              doc(
                collection(
                  doc(
                    collection(db, 'projects'),
                    route.params.projectId
                  ),
                  'studyAreas'
                ),
                route.params.studyAreaId
              ),
              'stratUnits'
            ),
            route.params.suId
          ),
          'materialGroups'
        ),
        route.params.groupId
      );
      
      console.log('Group ref created:', groupRef.path);

      // Try to get the group to check if it exists
      let groupExists = false;
      try {
        console.log('Checking if group exists...');
        const groupDoc = await getDoc(groupRef);
        groupExists = groupDoc.exists();
        console.log('Group exists check result:', groupExists);
      } catch (error) {
        console.error('Error checking if group exists:', error);
        groupExists = false;
      }

      // If group doesn't exist, create it with initial values
      if (!groupExists) {
        console.log('Creating new material group with ID:', route.params.groupId);
        const groupData = {
          materialId: route.params.materialId || '',
          materialType: route.params.materialType,
          totalWeight: 0,
          sherdCount: 0,
          createdAt: now,
          updatedAt: now
        };
        console.log('Group data:', groupData);
        
        try {
          console.log('Attempting to create document at path:', groupRef.path);
          await setDoc(groupRef, groupData);
          console.log('Successfully created material group');
          
          // Verify the document was created
          const docSnap = await getDoc(groupRef);
          if (!docSnap.exists()) {
            throw new Error('Failed to verify document creation - document does not exist after creation');
          }
          console.log('Verified document exists after creation');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error creating material group:', errorMessage);
          console.error('Full error object:', error);
          throw new Error(`Failed to create material group: ${errorMessage}`);
        }
      } else {
        console.log('Material group already exists, skipping creation');
      }

      // Add the new object
      await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'materialGroups', route.params.groupId,
        'objects'
      ), {
        diagnostic: diagnosticType,
        qualification: qualificationType,
        weight: weightValue,
        count: countValue,
        createdAt: now
      });

      // Update the material group's sherd count and total weight
      try {
        const projectCode = route.params.projectId.toUpperCase();
        
        // Update the group with new sherd count and total weight
        const updateData = {
          sherdCount: increment(countValue),
          totalWeight: increment(weightValue),
          updatedAt: now
        };
        
        console.log('Attempting to update material group with data:', updateData);
        console.log('Update path:', groupRef.path);
        
        try {
          await updateDoc(groupRef, updateData);
          console.log('Successfully updated material group');
          
          // Verify the update
          const updatedDoc = await getDoc(groupRef);
          console.log('Updated document data:', updatedDoc.data());
        } catch (updateError) {
          console.error('Update error details:', {
            error: updateError,
            path: groupRef.path,
            updateData: updateData
          });
          throw new Error(`Failed to update material group: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
        }
        
        // Update UniversalSherdDatabase
        try {
          await UniversalSherdDatabase.addSherd({
            sherdId: '', // Will be generated by the database
            projectId: route.params.projectId,
            studyAreaId: route.params.studyAreaId,
            stratUnitId: route.params.suId,
            containerId: route.params.containerId,
            objectGroupId: route.params.groupId,
            diagnosticType: diagnosticType,
            qualificationType: qualificationType,
            weight: weightValue,
            boundingBox: { x: 0, y: 0, width: 0, height: 0 } // Default values
          });
        } catch (dbError) {
          console.error('Error updating universal sherd database:', dbError);
          // Don't fail the operation if this fails
        }
        
        // Refresh the list and reset form
        fetchObjectGroups();
        setModalVisible(false);
        setDiagnosticType('rim');
        setWeight('');
        setCount('');
      } catch (updateError) {
        console.error('Error updating material group:', updateError);
        // Even if the update fails, we can still proceed
      }
    } catch (error) {
      console.error('Error adding object:', error);
      Alert.alert('Error', 'Failed to add object');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARCS</Text>
      </View>

      {/* Group Info */}
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>
          {materialId ? `${materialId} - ` : ''}{formatMaterialTypeLabel(materialType)}
        </Text>
        {objectGroups.length > 0 && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="cube-outline" size={20} color="#2D0C57" />
              <Text style={styles.statText}>
                {objectGroups.length} objects
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="scale-outline" size={20} color="#2D0C57" />
              <Text style={styles.statText}>
                {objectGroups.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0).toFixed(2)}g
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
                    <Text style={styles.cell}>{formatPartTypeLabel(item.diagnosticType) || 'N/A'}</Text>
                  </View>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.cell}>
                      {formatQualificationLabel(item.qualificationType, materialType) || 'N/A'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.cell}>{item.count || '1'}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.cell}>{item.weight ? `${item.weight}g` : '0g'}</Text>
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
                  {qualificationOptions.map(option => (
                    <Picker.Item 
                      key={option.value} 
                      label={option.label} 
                      value={option.value} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (grams)</Text>
              <TextInput
                style={styles.input}
                placeholder="Weight"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Count</Text>
              <TextInput
                style={styles.input}
                placeholder="Count"
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  qualificationLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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