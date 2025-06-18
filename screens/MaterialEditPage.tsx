import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';
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

const diagnosticTypes = ['rim', 'base', 'body', 'foot'] as const;
const qualificationTypes = ['its', 'african', 'black_gloss', 'sardinian', 'thin_wall'] as const;

const MaterialEditPage: React.FC<Props> = ({ route, navigation }) => {
  const { 
    projectId, 
    studyAreaId, 
    suId, 
    containerId, 
    groupId, 
    initialSherds, 
    annotatedImage, 
    fromImage 
  } = route.params;
  
  const [sherds, setSherds] = useState<Sherd[]>(initialSherds);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateSherd = (index: number, field: keyof Sherd, value: any) => {
    const updatedSherds = [...sherds];
    updatedSherds[index] = { ...updatedSherds[index], [field]: value };
    setSherds(updatedSherds);
  };

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      // Save to Firestore
      await addDoc(
        collection(
          db,
          'projects', projectId,
          'studyAreas', studyAreaId,
          'stratUnits', suId,
          'containers', containerId,
          'groups', groupId,
          'sherds'
        ),
        {
          sherds,
          timestamp: new Date(),
        }
      );

      // Save each sherd to the universal database
      await Promise.all(sherds.map(sherd => {
        const sherdData: Omit<UniversalSherdData, 'createdAt'> = {
          sherdId: sherd.sherd_id,
          projectId,
          studyAreaId,
          stratUnitId: suId,
          containerId,
          objectGroupId: groupId,
          diagnosticType: sherd.type_prediction,
          qualificationType: sherd.qualification_prediction,
          weight: sherd.weight || 0,
          analysisConfidence: sherd.confidence,
          boundingBox: {
            x: sherd.x || 0,
            y: sherd.y || 0,
            width: sherd.width || 0,
            height: sherd.height || 0
          },
          originalImageUrl: annotatedImage ? `data:image/jpeg;base64,${annotatedImage}` : undefined
        };
        return UniversalSherdDatabase.addSherd(sherdData);
      }));

      // Navigate back
      if (fromImage) {
        navigation.navigate('MaterialContainer', {
          projectId,
          studyAreaId,
          suId,
          containerId,
        });
      } else {
        navigation.goBack();
      }
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLogo}>ARC</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
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

        {route.params.annotatedImage && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: route.params.annotatedImage }} 
              style={styles.previewImage} 
              resizeMode="contain"
            />
          </View>
        )}
        
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
                  <Picker
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
                  </Picker>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Qualification</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={sherd.qualification_prediction}
                    onValueChange={(value) => updateSherd(index, 'qualification_prediction', value)}
                    style={styles.picker}
                    dropdownIconColor="#6C757D"
                  >
                    {qualificationTypes.map(type => (
                      <Picker.Item 
                        key={type} 
                        label={type.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')} 
                        value={type} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (grams)</Text>
                <TextInput
                  style={styles.input}
                  value={sherd.weight?.toString() || ''}
                  onChangeText={(value) => updateSherd(index, 'weight', parseFloat(value) || 0)}
                  keyboardType="numeric"
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
  },
  imageTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  annotatedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  previewImage: {
    width: '100%',
    height: 200,
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
    marginTop: 16,
    gap: 10
  }
});

export default MaterialEditPage;