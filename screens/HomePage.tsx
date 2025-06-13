import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, Modal, TextInput } from 'react-native';
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
};

export default function HomePage({ navigation }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

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
      await addDoc(collection(db, 'projects'), { name, code, description });
      setModalVisible(false);
      setName('');
      setCode('');
      setDescription('');
      fetchProjects();
    } catch (err) {
      console.error('Error adding project:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Projects</Text>
      <View style={styles.flexGrid}>
        {projects.map(project => (
          <TouchableOpacity
            key={project.id}
            style={styles.card}
            onPress={() => navigation.navigate('Project', { projectId: project.id })}
          >
            <Text style={styles.cardTitle}>{project.name}</Text>
            <Text>{project.code}</Text>
            <Text>{project.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Button title="Add Project" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>New Project</Text>
          <TextInput placeholder="Name" style={styles.input} value={name} onChangeText={setName} />
          <TextInput placeholder="Code" style={styles.input} value={code} onChangeText={setCode} />
          <TextInput placeholder="Description" style={styles.input} value={description} onChangeText={setDescription} />
          <Button title="Create" onPress={handleAddProject} />
          <Button title="Cancel" color="gray" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1 },
  title: { fontSize: 24, marginBottom: 10 },
  flexGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '45%',
    backgroundColor: '#eee',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
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
