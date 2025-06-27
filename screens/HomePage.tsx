import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, SafeAreaView } from 'react-native';
import NumberInput from '../components/NumberInput';
import { AntDesign } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, orderBy, query } from 'firebase/firestore';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type Project = {
  id: string;
  name: string;
  code: string;
  description: string;
  password?: string;
};

export default function HomePage({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [description, setDescription] = useState('');
  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const q = query(collection(db, 'projects'), orderBy('name'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleAddProject = async () => {
    try {
      await addDoc(collection(db, 'projects'), { 
        name, 
        code, 
        description,
        password: password || ''
      });
      setModalVisible(false);
      setName('');
      setCode('');
      setPassword('');
      setDescription('');
      fetchProjects();
    } catch (err) {
      console.error('Error adding project:', err);
    }
  };

  const handleProjectPress = (project: Project) => {
    setSelectedProject(project);
    setEnteredPassword('');
    setPasswordPromptVisible(true);
  };

  const handlePasswordSubmit = () => {
    if (!selectedProject) return;
    
    // If project has no password or the entered password matches
    if (!selectedProject.password || selectedProject.password === enteredPassword) {
      setPasswordPromptVisible(false);
      navigation.navigate('Project', { projectId: selectedProject.id });
    } else {
      alert('Incorrect password');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARCS</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Projects</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <AntDesign name="plus" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <ScrollView style={styles.projectsContainer}>
          {projects.map((project, index) => (
            <TouchableOpacity
              key={`${project.id}-${index}`}
              style={styles.card}
              onPress={() => handleProjectPress(project)}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>
                  {project.name}
                  {project.code && ` (${project.code})`}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Project Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>New Project</Text>
            <NumberInput 
              placeholder="Name" 
              value={name} 
              onChangeText={setName}
            />
            <NumberInput 
              placeholder="Code (e.g., TH)" 
              value={code} 
              onChangeText={setCode} 
              maxLength={10}
              autoCapitalize="characters"
            />
            <NumberInput 
              placeholder="Password (optional)" 
              value={password} 
              onChangeText={setPassword}
              secureTextEntry
            />
            <NumberInput 
              placeholder="Description" 
              style={styles.descriptionInput}
              value={description} 
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={handleAddProject}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Prompt Modal */}
      <Modal visible={passwordPromptVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Enter Project Password</Text>
            <Text style={styles.subtitle}>
              {selectedProject?.name} {selectedProject?.code ? `(${selectedProject.code})` : ''}
            </Text>
            <NumberInput 
              placeholder={selectedProject?.password ? 'Enter password' : 'No password (press OK)'}
              value={enteredPassword} 
              onChangeText={setEnteredPassword}
              secureTextEntry={!!selectedProject?.password}
              editable={true}
              onSubmitEditing={handlePasswordSubmit}
              autoFocus={true}
              enablesReturnKeyAutomatically={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPasswordPromptVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton]}
                onPress={handlePasswordSubmit}
              >
                <Text style={styles.createButtonText}>OK</Text>
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
    backgroundColor: '#f8f9fa',
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
  projectsContainer: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: 'top',
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
  },
});
