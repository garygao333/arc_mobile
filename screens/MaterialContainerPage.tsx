import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Button, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Image, 
  Alert, 
  ActivityIndicator, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import Constants from 'expo-constants';
import { Ionicons, AntDesign, MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy 
} from 'firebase/firestore';

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

// Dynamically derive backend URL based on the Expo dev server host so it works on any network
// const getServerUrl = () => {
//   // In Expo dev, debuggerHost is something like "10.0.0.3:8081" or "192.168.x.x:19000"
//   // We take the IP part and reuse port 8081 where the inference backend runs.
//   // Fallback to localhost when the property is missing (e.g. production build)
//   const host = (Constants.manifest as any)?.debuggerHost?.split(':')?.shift() || 'localhost';
//   return `http://${host}:8001`;
// };

const getServerUrl = () => {
  return 'https://arc-backend-v20v.onrender.com'; // Replace with your actual Render URL
};

const SERVER_URL = getServerUrl();

type Props = NativeStackScreenProps<RootStackParamList, 'MaterialContainer'>;

export default function MaterialContainerPage({ route, navigation }: Props) {
  // Set the navigation title
  React.useEffect(() => {
    navigation.setOptions({
      title: 'Stratigraphic Unit'
    });
  }, [navigation]);

  const [groups, setGroups] = useState<any[]>([]);
  
  // Modal states
  const [functionalTypeModal, setFunctionalTypeModal] = useState(false);
  const [methodSelectModal, setMethodSelectModal] = useState(false);
  const [imageInputModal, setImageInputModal] = useState(false);
  
  // Form states
  const [functionalType, setFunctionalType] = useState('fine-ware');
  const [materialGroupId, setMaterialGroupId] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [isImageAnalysisAvailable, setIsImageAnalysisAvailable] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);
  
  // Update image analysis availability when functional type changes
  useEffect(() => {
    setIsImageAnalysisAvailable(functionalType === 'fine-ware' || functionalType === 'coarse-ware');
  }, [functionalType]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const groupsRef = collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'materialGroups');
      const q = query(groupsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        materialId: doc.data().materialId || '',
        materialType: doc.data().materialType,
        totalWeight: doc.data().totalWeight || 0,
        sherdCount: doc.data().sherdCount || 0,
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      Alert.alert('Error', 'Failed to load material groups');
    }
  };

  const generateMaterialId = async () => {
    try {
      const groupsRef = collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'materialGroups');
      const q = query(groupsRef, orderBy('materialId', 'desc'));
      const querySnapshot = await getDocs(q);
      
      // Get the highest existing material number
      let nextNumber = 1;
      querySnapshot.forEach((doc) => {
        const materialId = doc.data().materialId;
        if (materialId) {
          const parts = materialId.split('-');
          if (parts.length > 1) {
            const num = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(num) && num >= nextNumber) {
              nextNumber = num + 1;
            }
          }
        }
      });
      
      return `${route.params.suId}-${nextNumber}`;
    } catch (error) {
      console.error('Error generating material ID:', error);
      // Fallback to timestamp if there's an error
      return `${route.params.suId}-${Date.now()}`;
    }
  };

  const openFunctionalTypeModal = async () => {
    try {
      const newId = await generateMaterialId();
      setMaterialGroupId(newId);
      setFunctionalTypeModal(true);
    } catch (error) {
      console.error('Error generating material ID:', error);
      Alert.alert('Error', 'Failed to generate material group ID');
    }
  };

  // Generate a new material group ID when the modal opens
  useEffect(() => {
    if (functionalTypeModal) {
      generateMaterialId().then(id => {
        setMaterialGroupId(id);
      });
    }
  }, [functionalTypeModal]);

  const handleCreateGroup = async () => {
    if (!functionalType) {
      Alert.alert('Error', 'Please select a material type');
      return;
    }

    if (!materialGroupId) {
      Alert.alert('Error', 'Material Group ID is required');
      return;
    }

    // Validate material group ID format (should be in format SU_ID-NUMBER)
    const idPattern = new RegExp(`^${route.params.suId}-\\d+$`);
    if (!idPattern.test(materialGroupId)) {
      Alert.alert('Error', `Material Group ID must be in format: ${route.params.suId}-NUMBER`);
      return;
    }

    // Check if ID already exists
    const groupsRef = collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'materialGroups');
    const q = query(groupsRef, where('materialId', '==', materialGroupId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      Alert.alert('Error', 'A material group with this ID already exists');
      return;
    }

    setMethodSelectModal(false);
    setFunctionalTypeModal(false);
    
    // Create the material group
    try {
      // Create the material group document
      const docRef = await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'materialGroups'
      ), {
        materialId: materialGroupId,
        materialType: functionalType,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalWeight: 0,
        sherdCount: 0
      });
      
      console.log('Created material group with ID:', docRef.id);
      
      // Navigate to the MaterialGroup screen
      navigation.navigate('MaterialGroup', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: docRef.id,
        materialType: functionalType as 'fine-ware' | 'coarse-ware' | 'cooking-ware' | 'amphora' | 'lamp',
        materialId: materialGroupId
      });
      
      // Refresh the groups list
      fetchGroups();
      
    } catch (error) {
      console.error('Error creating material group:', error);
      Alert.alert('Error', 'Failed to create material group: ' + (error as Error).message);
    }
  };

  const handleFormMethod = async () => {
    try {
      // First, create the material group document
      if (!materialGroupId) {
        Alert.alert('Error', 'Material Group ID is required');
        return;
      }
      
      // Validate material group ID format (should be in format SU_ID-NUMBER)
      const idPattern = new RegExp(`^${route.params.suId}-\\d+$`);
      if (!idPattern.test(materialGroupId)) {
        Alert.alert('Error', `Material Group ID must be in format: ${route.params.suId}-NUMBER`);
        return;
      }
      
      // Check if ID already exists
      const groupsRef = collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'materialGroups');
      const q = query(groupsRef, where('materialId', '==', materialGroupId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        Alert.alert('Error', 'A material group with this ID already exists');
        return;
      }
      const docRef = await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'materialGroups'
      ), {
        materialId: materialGroupId,
        materialType: functionalType,
        label: functionalType,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalWeight: 0,
        sherdCount: 0
      });

      console.log('Created material group with ID:', docRef.id);
      
      // Close modals
      setMethodSelectModal(false);
      setFunctionalTypeModal(false);

      // Refresh the groups list and wait for it to complete
      await fetchGroups();

      // Navigate to the new material group
      navigation.navigate('MaterialGroup', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: docRef.id,
        materialType: functionalType as 'fine-ware' | 'coarse-ware' | 'cooking-ware' | 'amphora' | 'lamp',
        materialId: materialGroupId
      });
      
    } catch (err) {
      console.error('Error adding material group:', err);
      Alert.alert("Error", `Failed to create material group: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    if (hasCameraPermission === false) {
      Alert.alert(
        "Permission Required",
        "Please enable camera access in your device settings to take photos.",
        [{ text: "OK" }]
      );
      return;
    }
  
    try {
      const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [4, 3], 
        quality: 1 
      });
  
      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };


  const handleAnalyzeImage = async () => {
    if (!imageUri || !totalWeight) {
      Alert.alert("Missing Data", "Please select an image and enter total weight");
      return;
    }
    
    // Ensure the functional type is valid for image analysis
    if (functionalType !== 'fine-ware' && functionalType !== 'coarse-ware') {
      Alert.alert("Invalid Material Type", "Image analysis is only available for Fine Ware and Coarse Ware.");
      return;
    }
  
    try {
      setImageLoading(true);
      console.log('Starting image analysis...');
      
      // First, create the material group document
      const materialId = await generateMaterialId();
      const groupRef = await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'materialGroups'
      ), {
        materialId,
        materialType: functionalType,
        label: functionalType,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalWeight: 0,
        sherdCount: 0
      });
      
      console.log('Created material group with ID:', groupRef.id);
  
      // Prepare the image file
      const uriParts = imageUri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      } as any);
      
      // Convert weight to number and ensure it's a valid number
      const weightValue = parseFloat(totalWeight);
      if (isNaN(weightValue)) {
        throw new Error('Invalid weight value');
      }
      
      formData.append('weight', weightValue.toString());
      formData.append('material_type', functionalType);
      
      // Log form data for debugging
      console.log('Sending request to server...');
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
  
      const response = await fetch(`${SERVER_URL}/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });
  
      clearTimeout(timeoutId);
  
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server responded with status: ${response.status}\n${errorText}`);
      }
  
      const result = await response.json();
      console.log('Analysis result:', result);
  
      // Reset states
      setImageInputModal(false);
      setMethodSelectModal(false);
      setFunctionalTypeModal(false);
      setImageLoading(false);
      setImageUri(null);
      setTotalWeight('');
      
      // Refresh the groups list
      await fetchGroups();
  
      // Navigate to the edit screen with results
      navigation.navigate('MaterialEdit', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: groupRef.id,
        materialId: materialId,
        initialSherds: result.sherds || [],
        annotatedImage: result.annotated_image || null,
        fromImage: true,
        materialType: functionalType as 'fine-ware' | 'coarse-ware'
      });
  
    } catch (error) {
      console.error('Error in handleAnalyzeImage:', error);
      setImageLoading(false);
      
      let errorMessage = 'Failed to analyze the image. Please check your connection and try again.';
      
      if (error instanceof Error) {
        errorMessage += `\n\nError: ${error.message}`;
      } else if (typeof error === 'string') {
        errorMessage += `\n\nError: ${error}`;
      } else {
        errorMessage += '\n\nAn unknown error occurred.';
      }
      
      Alert.alert('Analysis Error', errorMessage);
    }
  };

  const resetModals = () => {
    setFunctionalTypeModal(false);
    setMethodSelectModal(false);
    setImageInputModal(false);
    setImageUri(null);
    setTotalWeight('');
    setMaterialGroupId('');
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARCS</Text>
      </View>

      {/* Container Info */}
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>Stratigratphic Unit {route.params.suId}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Material Groups</Text>
          <TouchableOpacity 
            onPress={() => setFunctionalTypeModal(true)}
            style={styles.addButton}
          >
            <AntDesign name="plus" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={{ width: 100, marginRight: 15 }}>
              <Text style={styles.headerCell}>Material ID</Text>
            </View>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={styles.headerCell}>Type</Text>
            </View>
            <View style={{ width: 30, alignItems: 'flex-end' }}>
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </View>
          </View>
          
          {/* Table Rows */}
          <ScrollView style={styles.tableBody}>
            {groups.length > 0 ? (
              groups.map((item, index) => (
                <TouchableOpacity
                  key={`${item.id}-${index}`}
                  style={[
                    styles.tableRow,
                    { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8F9FA' }
                  ]}
                  onPress={() => {
                    const materialTypes = [
                      { id: 'fine-ware', label: 'Fine Ware' },
                      { id: 'coarse-ware', label: 'Coarse Ware' },
                      { id: 'cooking-ware', label: 'Cooking Ware' },
                      { id: 'amphora', label: 'Amphora' },
                      { id: 'lamp', label: 'Lamp' }
                    ];
                    
                    const materialType = (materialTypes.find((type) => type.id === item.materialType.toLowerCase())?.id || 'fine-ware') as 'fine-ware' | 'coarse-ware' | 'cooking-ware' | 'amphora' | 'lamp';
                    
                    navigation.navigate('MaterialGroup', {
                      projectId: route.params.projectId,
                      studyAreaId: route.params.studyAreaId,
                      suId: route.params.suId,
                      containerId: route.params.containerId,
                      groupId: item.id,
                      materialType: materialType,
                      materialId: item.materialId
                    });
                  }}
                >
                  <View style={{ width: 100, justifyContent: 'center', marginRight: 15 }}>
                    <Text style={[styles.cell, { fontWeight: '500' }]}>{item.materialId}</Text>
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center', marginRight: 15 }}>
                    <Text style={styles.cell}>
                      {formatMaterialTypeLabel(item.materialType)}
                    </Text>
                  </View>
                  <View style={{ width: 30, alignItems: 'flex-end' }}>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No material groups yet</Text>
                <TouchableOpacity 
                  style={styles.addButtonLarge}
                  onPress={openFunctionalTypeModal}
                >
                  <Text style={styles.addButtonText}>Add Material Group</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={functionalTypeModal}
        onRequestClose={resetModals}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Material Group</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Material Group ID</Text>
              <TextInput
                value={materialGroupId}
                onChangeText={setMaterialGroupId}
                style={[styles.input, { backgroundColor: '#fff' }]}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                selectTextOnFocus={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Material Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={functionalType}
                  onValueChange={setFunctionalType}
                  style={styles.picker}
                >
                  <Picker.Item label="Fine Ware" value="fine-ware" />
                  <Picker.Item label="Coarse Ware" value="coarse-ware" />
                  <Picker.Item label="Cooking Ware" value="cooking-ware" />
                  <Picker.Item label="Amphora" value="amphora" />
                  <Picker.Item label="Lamp" value="lamp" />
                </Picker>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={resetModals}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.createButton]} 
                onPress={() => {
                  setFunctionalTypeModal(false);
                  setMethodSelectModal(true);
                }}
              >
                <Text style={styles.createButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={methodSelectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Method</Text>
            <Text style={styles.modalSubtitle}>Selected: {functionalType}</Text>
            
            <TouchableOpacity 
              style={styles.methodButton}
              onPress={handleFormMethod}
            >
              <Ionicons name="document-text-outline" size={24} color="#2D0C57" />
              <Text style={styles.methodButtonText}>Form Entry</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.methodButton,
                !isImageAnalysisAvailable && styles.disabledButton
              ]}
              onPress={isImageAnalysisAvailable ? handleImageMethod : undefined}
              disabled={!isImageAnalysisAvailable}
            >
              <Ionicons 
                name="camera-outline" 
                size={24} 
                color={isImageAnalysisAvailable ? "#2D0C57" : "#999"} 
              />
              <Text style={[
                styles.methodButtonText,
                !isImageAnalysisAvailable && styles.disabledButtonText
              ]}>
                Image Analysis
                {!isImageAnalysisAvailable && ' (Fine/Coarse Ware Only)'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setMethodSelectModal(false);
                  setFunctionalTypeModal(true);
                }}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={imageInputModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Image Analysis Input</Text>
            <Text style={styles.modalSubtitle}>Type: {functionalType}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Total Weight (grams)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter total weight"
                keyboardType="decimal-pad" 
                returnKeyType="done"
                value={totalWeight} 
                onChangeText={setTotalWeight}
                onSubmitEditing={() => {
                  // This will be called when the Done button is pressed
                  // The keyboard will automatically dismiss due to blurOnSubmit
                }}
                blurOnSubmit={true}
              />
            </View>
            
            <View style={styles.imageContainer}>
              {imageUri ? (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.imagePreview} 
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={48} color="#6C757D" />
                  <Text style={styles.imagePlaceholderText}>No image selected</Text>
                </View>
              )}
              
              <View style={styles.imageButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.secondaryButton]}
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={20} color="#2D0C57" />
                  <Text style={styles.secondaryButtonText}>Choose from Library</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.secondaryButton]}
                  onPress={takePhoto}
                >
                  <Ionicons name="camera-outline" size={20} color="#2D0C57" />
                  <Text style={styles.secondaryButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setImageInputModal(false);
                  setMethodSelectModal(true);
                }}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
              
              {imageLoading ? (
                <View style={[styles.button, styles.createButton, styles.disabledButton]}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.createButton, 
                    (!imageUri || !totalWeight) && styles.disabledButton
                  ]} 
                  onPress={handleAnalyzeImage}
                  disabled={!imageUri || !totalWeight}
                >
                  <Text style={styles.createButtonText}>Analyze Image</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  addButtonLarge: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#2D0C57',
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
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
    color: '#6C757D',
    fontSize: 16,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 6,
    overflow: 'hidden',
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    color: '#212529',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 24,
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
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    marginBottom: 12,
  },
  methodButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#2D0C57',
    fontWeight: '500',
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    marginBottom: 12,
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#6C757D',
    fontSize: 14,
  },
  imageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
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
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 6,
  },
  secondaryButtonText: {
    marginLeft: 8,
    color: '#2D0C57',
    fontWeight: '500',
    fontSize: 14,
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
  },
  disabledButtonText: {
    color: '#999',
  },
});
