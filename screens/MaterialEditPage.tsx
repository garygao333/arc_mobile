import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import NumberInput from '../components/NumberInput';
import { Picker } from '@react-native-picker/picker';
import {Dropdown} from 'react-native-element-dropdown';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { UniversalSherdDatabase, type UniversalSherdData } from '../utils/universalDatabase';

type Sherd = {
  sherd_id: string;
  type_prediction: string;
  qualification_prediction: string;
  weight?: number;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  detection_id?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'MaterialEdit'>;

const diagnosticTypes = [
  { label: 'Rim', value: 'rim' },
  { label: 'Base', value: 'base' },
  { label: 'Body', value: 'body' },
  { label: 'Foot', value: 'foot' }
]

// Qualification types for fine and coarse ware
const fineWareQualificationTypes = [
  { label: 'ITS', value: 'its' },
  { label: 'African', value: 'african' },
  { label: 'Black Gloss', value: 'black_gloss' },
  { label: 'Sardinian', value: 'sardinian' },
  { label: 'Thin Wall', value: 'thin_wall' }
] as const;

const coarseWareQualificationTypes = [
  { label: 'Unidentified', value: 'unidentified' },
  { label: 'Punic', value: 'punic' }
] as const;

const MaterialEditPage: React.FC<Props> = ({ route, navigation }) => {
  const { 
    projectId, 
    studyAreaId, 
    suId, 
    containerId, 
    groupId, 
    initialSherds, 
    annotatedImage, 
    fromImage,
    materialType = 'fine-ware'
  } = route.params;
  
  // Select the appropriate qualification types based on material type
  const qualificationTypes = materialType === 'coarse-ware' 
    ? coarseWareQualificationTypes 
    : fineWareQualificationTypes;
  
  const [sherds, setSherds] = useState<Sherd[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize sherds from initialSherds on first render
  React.useEffect(() => {
    if (!hasInitialized && initialSherds && initialSherds.length > 0) {
      console.log('Initializing sherds from initialSherds:', initialSherds);
      setSherds(initialSherds);
      setHasInitialized(true);
    }
  }, [initialSherds, hasInitialized]);

  // Debug log when sherds change
  React.useEffect(() => {
    console.log('Current sherds state:', sherds);
  }, [sherds]);

  const updateSherd = (index: number, field: keyof Sherd, value: any) => {
    const updatedSherds = [...sherds];
    updatedSherds[index] = { ...updatedSherds[index], [field]: value };
    setSherds(updatedSherds);
  };

  const handleConfirm = async () => {
    console.log('Starting to save sherds:', sherds);
    if (!sherds || sherds.length === 0) {
      console.warn('No sherds to save');
      Alert.alert('No Sherds', 'There are no sherds to save.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      console.log(`Attempting to save ${sherds.length} sherds to group ${groupId}`);
      console.log('Project ID:', projectId);
      console.log('Study Area ID:', studyAreaId);
      console.log('SU ID:', suId);
      console.log('Container ID:', containerId);
      // Calculate total weight and count
      const totalWeight = sherds.reduce((sum, sherd) => sum + (sherd.weight || 0), 0);
      const sherdCount = sherds.length;
      
      // Save sherds to the material group
      const batch = [];
      
      // Add each sherd to the batch
      for (const [index, sherd] of sherds.entries()) {
        console.log(`Processing sherd ${index + 1}/${sherds.length}`, sherd);
        
        // Prepare Firestore-compatible sherd data
        const now = new Date().toISOString();
        const sherdData: Record<string, any> = {
          sherdId: sherd.sherd_id || '',
          projectId,
          studyAreaId,
          stratUnitId: suId,
          containerId,
          objectGroupId: groupId,
          diagnosticType: sherd.type_prediction || 'unknown',
          qualificationType: sherd.qualification_prediction || 'unknown',
          weight: Number(sherd.weight) || 0,
          // Convert bounding box to a flat structure for Firestore
          //THIS IS NOT THE RIGHT DATA - FIX THIS. 
          boundingBoxX: Number(sherd.x) || 0,
          boundingBoxY: Number(sherd.y) || 0,
          boundingBoxWidth: Number(sherd.width) || 0,
          boundingBoxHeight: Number(sherd.height) || 0,
          createdAt: now,
          updatedAt: now
        };
        
        // Only add analysisConfidence if it exists and is a number
        if (typeof sherd.confidence === 'number' && !isNaN(sherd.confidence)) {
          sherdData.analysisConfidence = Number(sherd.confidence);
        }
        
        // Only add originalImageUrl if it exists
        if (annotatedImage) {
          sherdData.originalImageUrl = `data:image/jpeg;base64,${annotatedImage}`;
        }
        
        try {
          // Add to Firestore
          console.log('Adding sherd to Firestore:', sherdData);
          const sherdRef = await addDoc(
            collection(
              db,
              'projects', projectId,
              'studyAreas', studyAreaId,
              'stratUnits', suId,
              'materialGroups', groupId,
              'objects'
            ),
            sherdData
          );
          console.log('Successfully added sherd to Firestore with ID:', sherdRef.id);
          
          // Add to Universal Database with proper bounding box structure
          const universalSherdData: Omit<UniversalSherdData, 'createdAt'> = {
            sherdId: sherdData.sherdId,
            projectId: sherdData.projectId,
            studyAreaId: sherdData.studyAreaId,
            stratUnitId: sherdData.stratUnitId,
            containerId: sherdData.containerId,
            objectGroupId: sherdData.objectGroupId,
            diagnosticType: sherdData.diagnosticType,
            qualificationType: sherdData.qualificationType,
            weight: sherdData.weight,
            analysisConfidence: sherdData.analysisConfidence,
            boundingBox: {
              x: sherdData.boundingBoxX,
              y: sherdData.boundingBoxY,
              width: sherdData.boundingBoxWidth,
              height: sherdData.boundingBoxHeight
            },
            originalImageUrl: sherdData.originalImageUrl,
            notes: '' // Add empty notes field as it's optional in the interface
          };
          await UniversalSherdDatabase.addSherd(universalSherdData);
        } catch (sherdError) {
          console.error(`Error saving sherd ${index + 1}:`, sherdError);
          throw new Error(`Failed to save sherd ${index + 1}: ${sherdError}`);
        }
      }
      
      // Update the material group with atomic increments
      const groupRef = doc(
        db,
        'projects', projectId,
        'studyAreas', studyAreaId,
        'stratUnits', suId,
        'materialGroups', groupId
      );
      
      // Use Firestore's increment for atomic updates
      await updateDoc(groupRef, {
        totalWeight: increment(totalWeight),
        sherdCount: increment(sherds.length),
        updatedAt: new Date().toISOString()
      });

      console.log('Successfully saved sherds to Firestore and Universal DB');
      
      // Navigate back
      navigation.goBack();
      // if (fromImage) {
      //   console.log('Navigating back to MaterialContainer');
      //   navigation.navigate('MaterialContainer', {
      //     projectId,
      //     studyAreaId,
      //     suId,
      //     containerId,
      //   });
      // } else {
      //   console.log('Navigating back to previous screen');
      //   navigation.goBack();
      // }
    } catch (error) {
      console.error('Error saving sherds:', error);
      Alert.alert('Error', 'Failed to save sherds. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Saving sherds...</Text>
          </View>
        )}
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLogo}>ARCS</Text>
          <View style={styles.headerRight}>
            {/* <Text style={styles.sherdCount}>{sherds.length} sherds</Text> */}
            {/* <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Image */}
        {annotatedImage && (
          <View style={styles.imageContainer}>
            <Text style={styles.imageTitle}>Detected Sherds</Text>
            <Image 
              source={{ uri: `data:image/jpeg;base64,${annotatedImage}` }}
              style={styles.annotatedImage}
              resizeMode="contain"
            />
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
{/* 
        {route.params.annotatedImage && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: route.params.annotatedImage }} 
              style={styles.previewImage} 
              resizeMode="contain"
            />
          </View>
        )} */}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {sherds.length} Sherd{sherds.length !== 1 ? 's' : ''} Detected
          </Text>
          
          {sherds.map((sherd, index) => (
            <View key={sherd.sherd_id} style={styles.card}>
              <Text style={styles.cardTitle}>Sherd {index + 1}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={styles.pickerContainer}>
                  {/* <Picker
                    selectedValue={sherd.type_prediction}
                    onValueChange={(value) => updateSherd(index, 'type_prediction', value)}
                    style={styles.picker}
                    dropdownIconColor="#6C757D"
                  >
                    {diagnosticTypes.map(type => (
                      <Picker.Item 
                        key={type} 
                        label={type.charAt(0).toUpperCase() + type.slice(1)} 
                        value={type} 
                      />
                    ))}
                  </Picker> */}
                  <Dropdown 
                    data={diagnosticTypes}
                    value={sherd.type_prediction}
                    onChange={(item) => updateSherd(index, 'type_prediction', item.value)}
                    style={styles.picker}
                    labelField="label"
                    valueField="value"
                    />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Qualification</Text>
                <View style={styles.pickerContainer}>
                  {/* <Picker
                    selectedValue={sherd.qualification_prediction}
                    onValueChange={(value) => updateSherd(index, 'qualification_prediction', value)}
                    style={styles.picker}
                    dropdownIconColor="#6C757D"
                  >
                    {qualificationTypes.map(({ label, value }) => (
                      <Picker.Item 
                        key={value} 
                        label={label}
                        value={value} 
                      />
                    ))}
                  </Picker> */}
                  <Dropdown 
                    data={qualificationTypes}
                    value={sherd.qualification_prediction}
                    onChange={(item) => updateSherd(index, 'qualification_prediction', item.value)}
                    style={styles.picker}
                    labelField="label"
                    valueField="value"
                    />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (grams)</Text>
                <NumberInput
                  value={sherd.weight?.toString() || ''}
                  onChangeText={(value) => updateSherd(index, 'weight', parseFloat(value) || 0)}
                  placeholder="0.0"
                  placeholderTextColor="#ADB5BD"
                />
              </View>
              
              {sherd.confidence && (
                <View style={styles.confidenceBadge}>
                  <Ionicons name="ribbon-outline" size={16} color="#2D0C57" />
                  <Text style={styles.confidenceText}>
                    {(sherd.confidence * 100).toFixed(1)}% Confidence
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        
        <View style={styles.buttonGroup}>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isProcessing && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Confirm & Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sherdCount: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 0,
    padding: 0,
  },
  header: {
    backgroundColor: '#2D0C57',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#fff',
  },
  imageContainer: {
    padding: 20,
    height: '25%',
  },
  imageTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  annotatedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewImage: {
    width: '100%',
    // height: 200,
    resizeMode: 'contain',
  },
  buttonRow: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#2D0C57',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  card: {
    padding: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#fff'
  },
  bottomButtons: {
    paddingTop: 20,
    gap: 10
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8
  },
  confidenceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666'
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default MaterialEditPage;