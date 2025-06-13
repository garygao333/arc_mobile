import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const diagnosticTypes = ['rim', 'base', 'body', 'foot'];
const qualificationTypes = ['its', 'african', 'black_gloss', 'sardinian', 'thin_wall'];

type Props = NativeStackScreenProps<RootStackParamList, 'MaterialEdit'>;

type Sherd = {
  sherd_id: string;
  weight: number;
  type_prediction: string;
  qualification_prediction: string;
};

type GroupedSherd = {
  diagnostic: string;
  qualification: string;
  count: number;
  weight: number;
};

export default function MaterialEditPage({ route, navigation }: Props) {
  const [sherds, setSherds] = useState<Sherd[]>(route.params.initialSherds);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateSherd = (index: number, field: keyof Sherd, value: string | number) => {
    const updated = [...sherds];
    updated[index] = { ...updated[index], [field]: value };
    setSherds(updated);
  };

  const groupSherds = (sherds: Sherd[]): GroupedSherd[] => {
    const grouped: { [key: string]: { count: number; total_weight: number } } = {};

    sherds.forEach(sherd => {
      const key = `${sherd.type_prediction}|${sherd.qualification_prediction}`;
      
      if (!grouped[key]) {
        grouped[key] = { count: 0, total_weight: 0.0 };
      }
      
      grouped[key].count += 1;
      grouped[key].total_weight += sherd.weight || 0.0;
    });

    const groupedSummary: GroupedSherd[] = [];
    
    Object.entries(grouped).forEach(([key, stats]) => {
      const [type_label, qual_label] = key.split('|');
      groupedSummary.push({
        diagnostic: type_label,
        qualification: qual_label,
        count: stats.count,
        weight: Math.round(stats.total_weight * 100) / 100
      });
    });

    return groupedSummary;
  };

  const saveGroupedSherdsToFirebase = async (groupedSherds: GroupedSherd[]) => {
    try {
      const promises = groupedSherds.map(group => 
        addDoc(collection(
          db,
          'projects', route.params.projectId,
          'studyAreas', route.params.studyAreaId,
          'stratUnits', route.params.suId,
          'containers', route.params.containerId,
          'groups', route.params.groupId,
          'objects'
        ), group)
      );

      await Promise.all(promises);
      console.log('Successfully saved all grouped sherds to Firebase');
    } catch (error) {
      console.error('Error saving grouped sherds to Firebase:', error);
      throw error;
    }
  };

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      
      const invalidSherds = sherds.filter(sherd => 
        !sherd.type_prediction || 
        !sherd.qualification_prediction || 
        sherd.weight <= 0
      );

      if (invalidSherds.length > 0) {
        Alert.alert(
          "Invalid Data", 
          "Please ensure all sherds have valid type, qualification, and weight values."
        );
        setIsProcessing(false);
        return;
      }

      const groupedSherds = groupSherds(sherds);
      
      console.log('Grouped sherds:', groupedSherds);

      await saveGroupedSherdsToFirebase(groupedSherds);

      Alert.alert(
        "Success", 
        `Successfully processed ${sherds.length} sherds into ${groupedSherds.length} groups`,
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate('MaterialGroup', {
                projectId: route.params.projectId,
                studyAreaId: route.params.studyAreaId,
                suId: route.params.suId,
                containerId: route.params.containerId,
                groupId: route.params.groupId
              });
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error processing sherds:', error);
      Alert.alert("Error", "Failed to process and save sherds. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const previewGroupedData = () => {
    const grouped = groupSherds(sherds);
    const preview = grouped.map(g => 
      `${g.diagnostic}/${g.qualification}: ${g.count} pieces, ${g.weight}g`
    ).join('\n');
    
    Alert.alert("Preview Grouped Data", preview);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Edit Sherds ({sherds.length} items)</Text>
      
      {route.params.annotatedImage && (
        <View style={styles.imageContainer}>
          <Text style={styles.imageTitle}>Detected Sherds</Text>
          <Image 
            source={{ uri: `data:image/jpeg;base64,${route.params.annotatedImage}` }}
            style={styles.annotatedImage}
            resizeMode="contain"
          />
        </View>
      )}
      
      <View style={styles.buttonRow}>
        <Button title="Preview Groups" onPress={previewGroupedData} color="#007AFF" />
      </View>

      <FlatList
        data={sherds}
        keyExtractor={(item) => item.sherd_id}
        scrollEnabled={false}
        renderItem={({ item, index }) => (
          <View style={styles.sherdBox}>
            <Text style={styles.sherdId}>{item.sherd_id}</Text>
            
            <Text style={styles.label}>Weight (grams):</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={item.weight.toString()}
              onChangeText={(val) => updateSherd(index, 'weight', parseFloat(val) || 0)}
            />

            <Text style={styles.label}>Diagnostic Type:</Text>
            <Picker
              style={styles.picker}
              selectedValue={item.type_prediction}
              onValueChange={(val) => updateSherd(index, 'type_prediction', val)}
            >
              {diagnosticTypes.map((opt) => (
                <Picker.Item label={opt.charAt(0).toUpperCase() + opt.slice(1)} value={opt} key={opt} />
              ))}
            </Picker>

            <Text style={styles.label}>Qualification:</Text>
            <Picker
              style={styles.picker}
              selectedValue={item.qualification_prediction}
              onValueChange={(val) => updateSherd(index, 'qualification_prediction', val)}
            >
              {qualificationTypes.map((opt) => (
                <Picker.Item 
                  label={opt.replace('_', ' ').toUpperCase()} 
                  value={opt} 
                  key={opt} 
                />
              ))}
            </Picker>
          </View>
        )}
      />

      <View style={styles.bottomButtons}>
        <Button 
          title={isProcessing ? "Processing..." : "Confirm & Save Groups"} 
          onPress={handleConfirm}
          disabled={isProcessing}
          color="#28a745"
        />
        <Button 
          title="Cancel" 
          onPress={() => {
            if (route.params.fromImage) {
              navigation.navigate('MaterialContainer', {
                projectId: route.params.projectId,
                studyAreaId: route.params.studyAreaId,
                suId: route.params.suId,
                containerId: route.params.containerId
              });
            } else {
              navigation.goBack();
            }
          }} 
          color="#dc3545"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 15,
    textAlign: 'center'
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  imageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  annotatedImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  buttonRow: {
    marginBottom: 15,
    alignItems: 'center'
  },
  sherdBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sherdId: { 
    fontWeight: 'bold', 
    fontSize: 16,
    marginBottom: 10,
    color: '#333'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 5,
    color: '#555'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    backgroundColor: '#fff'
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    borderRadius: 5
  },
  bottomButtons: {
    paddingTop: 20,
    gap: 10
  }
});