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

      // Determine material type based on functional type
      const materialType = functionalType === 'coarse-ware' ? 'coarse-ware' : 'fine-ware';
      
      navigation.navigate('MaterialGroup', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: docRef.id,
        materialType: materialType as 'fine-ware' | 'coarse-ware'
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
  
      // Create document reference first
      const docRef = await addDoc(collection(
        db,
        'projects', route.params.projectId,
        'studyAreas', route.params.studyAreaId,
        'stratUnits', route.params.suId,
        'containers', route.params.containerId,
        'groups'
      ), {
        label: functionalType,
        createdAt: new Date().toISOString()
      });
  
      console.log('Created document with ID:', docRef.id);
  
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
      
      // Log form data for debugging
      console.log('Sending request to server...');
      console.log('Form data entries:');
      // @ts-ignore - _parts is not in the TypeScript type definition but exists in React Native
      const formDataEntries = formData._parts || [];
      formDataEntries.forEach(([key, value]: [string, any]) => {
        console.log(`- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
      });
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
  
      // Add the material type to the form data
      formData.append('material_type', functionalType);
      
      const response = await fetch(`${SERVER_URL}/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Let the browser set the Content-Type with the correct boundary
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
  
      // Navigate to the edit screen with results
      const materialType = functionalType === 'coarse-ware' ? 'coarse-ware' : 'fine-ware';
      navigation.navigate('MaterialEdit', {
        projectId: route.params.projectId,
        studyAreaId: route.params.studyAreaId,
        suId: route.params.suId,
        containerId: route.params.containerId,
        groupId: docRef.id,
        initialSherds: result.sherds || [],
        annotatedImage: result.annotated_image || null,
        fromImage: true,
        materialType: materialType as 'fine-ware' | 'coarse-ware'
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
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>ARC</Text>
      </View>

      {/* Container Info */}
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>Container {route.params.containerId}</Text>
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
            <View style={{ flex: 2 }}>
              <Text style={styles.headerCell}>Type</Text>
            </View>
            <View style={{ width: 24 }} />
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
                    
                    const materialType = materialTypes.find((type) => type.id === item.label.toLowerCase())?.id || 'fine-ware' as const;
                    
                    navigation.navigate('MaterialGroup', {
                      projectId: route.params.projectId,
                      studyAreaId: route.params.studyAreaId,
                      suId: route.params.suId,
                      containerId: route.params.containerId,
                      groupId: item.id,
                      materialType: materialType as 'fine-ware' | 'coarse-ware' | 'cooking-ware' | 'amphora' | 'lamp'
                    });
                  }}
                >
                  <View style={{ flex: 2 }}>
                    <Text style={styles.cell}>{formatMaterialTypeLabel(item.label)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No material groups yet</Text>
                <TouchableOpacity 
                  style={styles.addButtonLarge}
                  onPress={() => setFunctionalTypeModal(true)}
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
            <Text style={styles.modalTitle}>Select Functional Type</Text>
            
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
