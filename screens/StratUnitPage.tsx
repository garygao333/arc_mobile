// import React, { useEffect, useState } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   TouchableOpacity, 
//   Modal, 
//   TextInput, 
//   Alert, 
//   ScrollView, 
//   SafeAreaView, 
//   ActivityIndicator,
//   Platform
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';
// import { NativeStackScreenProps } from '@react-navigation/native-stack';
// import { RootStackParamList } from '../App';
// import { Ionicons, AntDesign } from '@expo/vector-icons';
// import { db } from '../firebaseConfig';
// import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

// export default function StratUnitPage({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'StratUnit'>) {
//   type Container = {
//     id: string;
//     containerType: 'Bag' | 'Box' | 'Tray';
//     materialType: string;
//   };

//   const [containers, setContainers] = useState<Container[]>([]);
//   const [modalVisible, setModalVisible] = useState(false);
//   const [containerType, setContainerType] = useState<'Bag' | 'Box' | 'Tray'>('Bag');
//   const [materialType, setMaterialType] = useState('Pottery');

//   useEffect(() => {
//     fetchContainers();
//   }, [route.params.suId]);

//   const fetchContainers = async () => {
//     try {
//       const q = query(collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'containers'), orderBy('id'));
//       const querySnapshot = await getDocs(q);
//       const items = querySnapshot.docs.map(doc => ({
//         id: doc.data().id,
//         containerType: doc.data().containerType || 'Bag',
//         materialType: doc.data().materialType || 'Pottery'
//       }));
//       setContainers(items);
//     } catch (error) {
//       console.error('Error fetching containers:', error);
//     }
//   };

//   const handleAddContainer = async () => {
//     console.log('Adding container:', { containerType, materialType }); // Debug log
//     const existingIds = containers.map(c => c.id);
//     let nextLetter = 'A';
//     while (existingIds.includes(`${route.params.suId}-${nextLetter}`)) {
//       nextLetter = String.fromCharCode(nextLetter.charCodeAt(0) + 1);
//     }
//     const newId = `${route.params.suId}-${nextLetter}`;
//     try {
//       await addDoc(collection(db, 'projects', route.params.projectId, 'studyAreas', route.params.studyAreaId, 'stratUnits', route.params.suId, 'containers'), {
//         id: newId,
//         containerType,
//         materialType
//       });
//       setModalVisible(false);
//       setContainerType('Bag');
//       setMaterialType('Pottery');
//       fetchContainers();
//     } catch (error) {
//       console.error('Error adding container:', error);
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <Text style={styles.headerLogo}>ARC</Text>
//       </View>

//       {/* Strat Unit Info */}
//       <View style={styles.projectInfo}>
//         <Text style={styles.projectName}>SU {route.params.suId}</Text>
//         <Text style={styles.projectCode}>{route.params.typology}</Text>
//         {route.params.label ? (
//           <Text style={styles.projectDescription}>{route.params.label}</Text>
//         ) : null}
//       </View>

//       {/* Content */}
//       <View style={styles.content}>
//         <View style={styles.titleRow}>
//           <Text style={styles.title}>Material Containers</Text>
//           <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
//             <AntDesign name="plus" size={24} color="black" />
//           </TouchableOpacity>
//         </View>
        
//         <View style={styles.divider} />
        
//         <View style={styles.tableContainer}>
//           {/* Table Header */}
//           <View style={styles.tableHeader}>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.headerCell}>ID</Text>
//             </View>
//             <View style={{ flex: 2 }}>
//               <Text style={styles.headerCell}>Container</Text>
//             </View>
//             <View style={{ width: 24 }} />
//           </View>
          
//           {/* Table Rows */}
//           <ScrollView style={styles.tableBody}>
//             {containers.map((item, index) => (
//               <TouchableOpacity
//                 key={`${item.id}-${index}`}
//                 style={[
//                   styles.tableRow,
//                   { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8F9FA' }
//                 ]}
//                 onPress={() => navigation.navigate('MaterialContainer', { 
//                   containerId: item.id, 
//                   projectId: route.params.projectId, 
//                   studyAreaId: route.params.studyAreaId, 
//                   suId: route.params.suId 
//                 })}
//               >
//                 <View style={{ flex: 1, justifyContent: 'center' }}>
//                   <Text style={styles.cell}>{item.id}</Text>
//                 </View>
//                 <View style={{ flex: 2, justifyContent: 'center' }}>
//                   <Text style={styles.cell}>
//                     {item.containerType} of {item.materialType}
//                   </Text>
//                 </View>
//                 <Ionicons name="chevron-forward" size={20} color="#666" />
//               </TouchableOpacity>
//             ))}
//             {containers.length === 0 && (
//               <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
//                 <Text style={{ color: '#666', fontSize: 16 }}>No containers found</Text>
//               </View>
//             )}
//           </ScrollView>
//         </View>
//       </View>

//       {/* Add Material Container Modal */}
//       <Modal
//         animationType="slide"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}
//       >
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Add Material Container</Text>
            
//             <View style={styles.inputGroup}>
//               <Text style={styles.inputLabel}>Container Type</Text>
//               <TouchableOpacity 
//                 style={styles.customPicker}
//                 onPress={() => {
//                   Alert.alert(
//                     'Select Container Type',
//                     '',
//                     [
//                       { 
//                         text: 'Bag', 
//                         onPress: () => {
//                           console.log('Container type changed to: Bag');
//                           setContainerType('Bag');
//                         }
//                       },
//                       { 
//                         text: 'Box', 
//                         onPress: () => {
//                           console.log('Container type changed to: Box');
//                           setContainerType('Box');
//                         }
//                       },
//                       { 
//                         text: 'Tray', 
//                         onPress: () => {
//                           console.log('Container type changed to: Tray');
//                           setContainerType('Tray');
//                         }
//                       },
//                       { text: 'Cancel', style: 'cancel' }
//                     ]
//                   );
//                 }}
//               >
//                 <Text style={styles.pickerText}>{containerType}</Text>
//                 <Ionicons name="chevron-down" size={20} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <View style={styles.inputGroup}>
//               <Text style={styles.inputLabel}>Material Type</Text>
//               <TouchableOpacity 
//                 style={styles.customPicker}
//                 onPress={() => {
//                   Alert.alert(
//                     'Select Material Type',
//                     '',
//                     [
//                       { 
//                         text: 'Pottery', 
//                         onPress: () => {
//                           console.log('Material type changed to: Pottery');
//                           setMaterialType('Pottery');
//                         }
//                       },
//                       { 
//                         text: 'Lithics', 
//                         onPress: () => {
//                           console.log('Material type changed to: Lithics');
//                           setMaterialType('Lithics');
//                         }
//                       },
//                       { 
//                         text: 'Metal', 
//                         onPress: () => {
//                           console.log('Material type changed to: Metal');
//                           setMaterialType('Metal');
//                         }
//                       },
//                       { 
//                         text: 'Bone', 
//                         onPress: () => {
//                           console.log('Material type changed to: Bone');
//                           setMaterialType('Bone');
//                         }
//                       },
//                       { 
//                         text: 'Shell', 
//                         onPress: () => {
//                           console.log('Material type changed to: Shell');
//                           setMaterialType('Shell');
//                         }
//                       },
//                       { 
//                         text: 'Other', 
//                         onPress: () => {
//                           console.log('Material type changed to: Other');
//                           setMaterialType('Other');
//                         }
//                       },
//                       { text: 'Cancel', style: 'cancel' }
//                     ]
//                   );
//                 }}
//               >
//                 <Text style={styles.pickerText}>{materialType}</Text>
//                 <Ionicons name="chevron-down" size={20} color="#666" />
//               </TouchableOpacity>
//             </View>
            
//             <View style={styles.modalButtons}>
//               <TouchableOpacity 
//                 style={[styles.button, styles.cancelButton]} 
//                 onPress={() => setModalVisible(false)}
//               >
//                 <Text style={styles.cancelButtonText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity 
//                 style={[styles.button, styles.createButton]} 
//                 onPress={handleAddContainer}
//               >
//                 <Text style={styles.createButtonText}>Create</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//   },
//   header: {
//     backgroundColor: '#2D0C57',
//     padding: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     height: 80,
//   },
//   headerLogo: {
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   projectInfo: {
//     padding: 16,
//     backgroundColor: '#F8F9FA',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E0E0E0',
//   },
//   projectName: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   projectCode: {
//     fontSize: 18,
//     color: '#666',
//     marginBottom: 8,
//   },
//   projectDescription: {
//     fontSize: 16,
//     color: '#444',
//     lineHeight: 22,
//   },
//   content: {
//     flex: 1,
//     padding: 16,
//   },
//   titleRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   addButton: {
//     padding: 8,
//   },
//   divider: {
//     height: 1,
//     backgroundColor: '#E0E0E0',
//     marginBottom: 16,
//   },
//   tableContainer: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 8,
//     overflow: 'hidden',
//   },
//   tableHeader: {
//     flexDirection: 'row',
//     backgroundColor: '#F5F5F5',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E0E0E0',
//   },
//   headerCell: {
//     fontWeight: '600',
//     color: '#444',
//     fontSize: 14,
//   },
//   tableBody: {
//     flex: 1,
//   },
//   tableRow: {
//     flexDirection: 'row',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   cell: {
//     fontSize: 14,
//     color: '#333',
//     marginRight: 16,
//   },
//   modalTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   modalButtons: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 8,
//   },
//   button: {
//     paddingVertical: 12,
//     paddingHorizontal: 24,
//     borderRadius: 8,
//     marginLeft: 12,
//     minWidth: 100,
//     alignItems: 'center',
//   },
//   cancelButton: {
//     backgroundColor: '#F5F5F5',
//   },
//   createButton: {
//     backgroundColor: '#2D0C57',
//   },
//   cancelButtonText: {
//     color: '#666',
//     fontWeight: '600',
//   },
//   createButtonText: {
//     color: 'white',
//     fontWeight: '600',
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   inputLabel: {
//     fontSize: 14,
//     color: '#444',
//     marginBottom: 8,
//     fontWeight: '600',
//   },
//   // Updated picker styles
//   pickerWrapper: {
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 8,
//     backgroundColor: '#FFFFFF',
//     ...Platform.select({
//       ios: {
//         paddingHorizontal: 10,
//       },
//       android: {
//         overflow: 'hidden',
//       },
//     }),
//   },
//   picker: {
//     height: Platform.OS === 'android' ? 50 : 150,
//     width: '100%',
//     ...Platform.select({
//       ios: {
//         backgroundColor: 'transparent',
//       },
//       android: {
//         backgroundColor: '#FFFFFF',
//         color: '#000000',
//       },
//     }),
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: 'white',
//     borderRadius: 12,
//     padding: 24,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 4,
//     elevation: 5,
//   },
//   customPicker: {
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     borderRadius: 8,
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     minHeight: 50,
//   },
//   pickerText: {
//     fontSize: 16,
//     color: '#333',
//     flex: 1,
//   },
// });