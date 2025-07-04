import React, { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  Alert, 
  SafeAreaView,
  ScrollView,
  TextInput
} from 'react-native';
import NumberInput from '../components/NumberInput';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import EditableText from '../components/EditableText';

type StudyArea = {
  id: string;
  label: string;
};

type Project = {
  id: string;
  name: string;
  code: string;
  description: string;
};

interface ProjectPageProps {
  project: Project;
  navigation: any;
  onProjectUpdated: (updatedProject: Project) => void;
  onClose: () => void;
}

export default function ProjectPage({ project, navigation, onProjectUpdated, onClose }: ProjectPageProps) {
  const [studyAreas, setStudyAreas] = useState<StudyArea[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [studyAreaId, setStudyAreaId] = useState('');

  // const fetchProject = async () => {
  //   try {
  //     const docRef = doc(db, 'projects', route.params.projectId);
  //     const docSnap = await getDoc(docRef);
  //     if (docSnap.exists()) {
  //       setProject({ id: docSnap.id, ...docSnap.data() } as Project);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching project:', error);
  //   }
  // };

  const fetchStudyAreas = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects', project.id, 'studyAreas'));
      const areas = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setStudyAreas(areas);
    } catch (error) {
      console.error('Error fetching study areas:', error);
    }
  }, [project.id]);


  useEffect(() => {
    // fetchProject();
    fetchStudyAreas();
  }, [fetchStudyAreas]);

  // Generate a new study area ID when the modal opens
  const openStudyAreaModal = () => {
    const existingIds = studyAreas.map(a => parseInt(a.id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1000 : 1000;
    const newId = String(nextId).padStart(5, '0');
    setStudyAreaId(newId);
    setModalVisible(true);
  };

  const handleAddStudyArea = async () => {
    if (!labelInput.trim()) {
      Alert.alert('Error', 'Short description is required');
      return;
    }

    // Validate study area ID format (5 digits)
    if (!/^\d{5}$/.test(studyAreaId)) {
      Alert.alert('Error', 'Study Area ID must be a 5-digit number');
      return;
    }

    // Check if ID already exists
    if (studyAreas.some(area => area.id === studyAreaId)) {
      Alert.alert('Error', 'A study area with this ID already exists');
      return;
    }

    try {
      await addDoc(collection(db, 'projects', project.id, 'studyAreas'), {
        id: studyAreaId,
        label: labelInput.trim()
      });
      setModalVisible(false);
      setLabelInput('');
      setStudyAreaId('');
      fetchStudyAreas();
    } catch (error) {
      console.error('Error adding study area:', error);
      Alert.alert('Error', 'Failed to create study area. Please try again.');
    }
  };

  if (!project) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARCS</Text>
      </View>

      {/* Project Info */}
      <View style={styles.projectInfo}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.projectName}>{project.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <EditableText
            value={project.code}
            onSave={async (newCode) => {
              try {
                const projectRef = doc(db, 'projects', project.id);
                await updateDoc(projectRef, { code: newCode });
                // setProject({ ...project, code: newCode });
                onProjectUpdated({ ...project, code: newCode });
                return true;
              } catch (error) {
                console.error('Error updating project code:', error);
                Alert.alert('Error', 'Failed to update project code. Please try again.');
                return false;
              }
            }}
            textStyle={styles.projectCode}
            containerStyle={{ flex: 1 }}
            inputStyle={{
              ...styles.projectCode,
              borderBottomWidth: 1,
              borderBottomColor: '#ccc',
              paddingVertical: 4,
              paddingHorizontal: 8,
              marginLeft: -8
            }}
          />
        </View>
        <Text style={styles.projectDescription}>{project.description}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Study Areas</Text>
          <TouchableOpacity onPress={openStudyAreaModal} style={styles.addButton}>
            <AntDesign name="plus" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerCell}>Study Area</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.headerCell}>Short description</Text>
            </View>
            <View style={{ width: 24 }} /> {/* Spacer for the chevron */}
          </View>
          
          {/* Table Rows */}
          <ScrollView style={styles.tableBody}>
            {studyAreas.map((area, index) => (
              <TouchableOpacity
                key={`${area.id}-${index}`}
                style={[
                  styles.tableRow,
                  { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8F9FA' }
                ]}
                onPress={() => navigation.navigate('StudyArea', { 
                  studyAreaId: area.id, 
                  projectId: project.id 
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cell}>{area.id}</Text>
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.cell}>{area.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Add Study Area Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Add Study Area</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Study Area ID</Text>
              <NumberInput
                placeholder="e.g., 01000"
                value={studyAreaId}
                onChangeText={setStudyAreaId}
                placeholderTextColor="#999"
                maxLength={5}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Short description</Text>
              <TextInput
                placeholder="Short description"
                value={labelInput}
                onChangeText={setLabelInput}
                style={styles.input}
                placeholderTextColor="#999"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => {}}
              />
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={handleAddStudyArea}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    marginRight: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  input: {
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
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
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
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  }
});