import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Modal, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

const SERVER_URL = 'http://192.168.1.104:8000';

type Props = NativeStackScreenProps<RootStackParamList, 'MaterialContainer'>;

export default function MaterialContainerPage({ route, navigation }: Props) {
  const [groups, setGroups] = useState<any[]>([]);
  
  // Modal states
  const [functionalTypeModal, setFunctionalTypeModal] = useState(false);
  const [methodSelectModal, setMethodSelectModal] = useState(false);
  const [imageInputModal, setImageInputModal] = useState(false);
  
  // Form states
  const [functionalType, setFunctionalType] = useState('fine-ware');
  const [totalWeight, setTotalWeight] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const q = query(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'containers', route.params.containerId,
        'groups'
      ), orderBy('label'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(data);
    } catch (err) {
      console.error('Error fetching material groups:', err);
    }
  };

  const handleFormMethod = async () => {
    try {
      const docRef = await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'containers', route.params.containerId,
        'groups'
      ), {
        label: functionalType
      });

      setMethodSelectModal(false);
      setFunctionalTypeModal(false);

      fetchGroups();

      navigation.navigate('MaterialGroup', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: docRef.id
      });
    } catch (err) {
      console.error('Error adding material group:', err);
      Alert.alert("Error", "Failed to create material group");
    }
  };

  const handleImageMethod = () => {
    setMethodSelectModal(false);
    setImageInputModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [4, 3], 
      quality: 1 
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [4, 3], 
      quality: 1 
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageUri || !totalWeight) {
      Alert.alert("Missing Data", "Please select an image and enter total weight");
      return;
    }

    try {
      setImageLoading(true);

      const docRef = await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'containers', route.params.containerId,
        'groups'
      ), {
        label: functionalType
      });

      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'upload.jpg'
      } as any);
      formData.append('weight', totalWeight.toString());

      const response = await fetch(`${SERVER_URL}/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setImageInputModal(false);
      setMethodSelectModal(false);
      setFunctionalTypeModal(false);
      setImageLoading(false);
      setImageUri(null);
      setTotalWeight('');

      navigation.navigate('MaterialEdit', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: docRef.id,
        initialSherds: result.sherds,
        annotatedImage: result.annotated_image,
        fromImage: true 
      });

    } catch (err) {
      setImageLoading(false);
      Alert.alert("Error", "Error running AI inference");
      console.error(err);
    }
  };

  const resetModals = () => {
    setFunctionalTypeModal(false);
    setMethodSelectModal(false);
    setImageInputModal(false);
    setImageUri(null);
    setTotalWeight('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Container: {route.params.containerId}</Text>
      <View style={styles.tableHeader}>
        <Text style={styles.headerText}>Label</Text>
        <Text style={styles.headerText}></Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.tableRow}>
            <Text style={styles.rowText}>{item.label}</Text>
            <Button title=">" onPress={() => navigation.navigate('MaterialGroup', {
              projectId: route.params.projectId,
              studyAreaId: route.params.studyAreaId,
              suId: route.params.suId,
              containerId: route.params.containerId,
              groupId: item.id
            })} />
          </View>
        )}
      />

      <Button title="Add Material Group" onPress={() => setFunctionalTypeModal(true)} />

      <Modal visible={functionalTypeModal} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Functional Type</Text>
          <Picker selectedValue={functionalType} onValueChange={setFunctionalType}>
            <Picker.Item label="Fine-ware" value="fine-ware" />
            <Picker.Item label="Coarse-ware" value="coarse-ware" />
          </Picker>
          <Button title="Continue" onPress={() => {
            setFunctionalTypeModal(false);
            setMethodSelectModal(true);
          }} />
          <Button title="Cancel" color="gray" onPress={resetModals} />
        </View>
      </Modal>

      <Modal visible={methodSelectModal} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Choose Method</Text>
          <Text style={styles.subtitle}>Selected: {functionalType}</Text>
          <View style={styles.buttonSpacing}>
            <Button title="Form Entry" onPress={handleFormMethod} />
          </View>
          <View style={styles.buttonSpacing}>
            <Button title="Image Analysis" onPress={handleImageMethod} />
          </View>
          <Button title="Back" color="gray" onPress={() => {
            setMethodSelectModal(false);
            setFunctionalTypeModal(true);
          }} />
        </View>
      </Modal>

      <Modal visible={imageInputModal} animationType="slide" transparent>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Image Analysis Input</Text>
          <Text style={styles.subtitle}>Type: {functionalType}</Text>
          
          <TextInput 
            style={styles.input} 
            placeholder="Total Weight (grams)" 
            keyboardType="decimal-pad" 
            value={totalWeight} 
            onChangeText={setTotalWeight} 
          />
          
          <View style={styles.buttonSpacing}>
            <Button title="Upload Image" onPress={pickImage} />
          </View>
          <View style={styles.buttonSpacing}>
            <Button title="Take Photo" onPress={takePhoto} />
          </View>
          
          {imageUri && (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.previewImage} 
            />
          )}
          
          {imageLoading ? (
            <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 10 }} />
          ) : (
            <View style={styles.buttonSpacing}>
              <Button 
                title="Analyze Image" 
                onPress={handleAnalyzeImage}
                disabled={!imageUri || !totalWeight}
              />
            </View>
          )}
          
          <Button title="Back" color="gray" onPress={() => {
            setImageInputModal(false);
            setMethodSelectModal(true);
          }} />
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
  headerText: { fontWeight: 'bold', width: '50%' },
  tableRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderColor: '#ccc',
  },
  rowText: { width: '50%' },
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  input: {
    borderWidth: 1, 
    borderColor: '#ccc', 
    padding: 10, 
    marginBottom: 10, 
    borderRadius: 5
  },
  buttonSpacing: {
    marginBottom: 10
  },
  previewImage: {
    width: 200, 
    height: 200, 
    marginTop: 10, 
    marginBottom: 10,
    alignSelf: 'center',
    borderRadius: 8
  }
});