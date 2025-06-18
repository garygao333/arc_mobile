import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TextInput, Button } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { UniversalSherdData } from '../utils/universalDatabase';

interface Props {
  projectFilter?: string;
}

export default function UniversalDatabaseViewer({ projectFilter }: Props) {
  const [sherds, setSherds] = useState<(UniversalSherdData & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchProject, setSearchProject] = useState(projectFilter || '');
  const [stats, setStats] = useState({
    totalSherds: 0,
    totalWeight: 0,
    projectCounts: {} as Record<string, number>
  });

  const fetchSherds = async () => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'universal'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      if (searchProject) {
        q = query(
          collection(db, 'universal'),
          where('projectId', '==', searchProject.toUpperCase()),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const sherdData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UniversalSherdData & { id: string }));

      setSherds(sherdData);
      calculateStats(sherdData);
    } catch (error) {
      console.error('Error fetching universal sherds:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sherdData: UniversalSherdData[]) => {
    const totalSherds = sherdData.length;
    const totalWeight = sherdData.reduce((sum, sherd) => sum + sherd.weight, 0);
    const projectCounts = sherdData.reduce((acc, sherd) => {
      acc[sherd.projectId] = (acc[sherd.projectId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    setStats({ totalSherds, totalWeight, projectCounts });
  };

  useEffect(() => {
    fetchSherds();
  }, []);

  const renderSherd = ({ item }: { item: UniversalSherdData & { id: string } }) => (
    <View style={styles.sherdCard}>
      <View style={styles.sherdHeader}>
        <Text style={styles.sherdId}>{item.sherdId}</Text>
        <Text style={styles.projectBadge}>{item.projectId}</Text>
      </View>
      
      <View style={styles.sherdDetails}>
        <Text>Type: {item.diagnosticType}</Text>
        <Text>Qualification: {item.qualificationType}</Text>
        <Text>Weight: {item.weight.toFixed(2)}g</Text>
        <Text>Location: {item.studyAreaId}/{item.stratUnitId}/{item.containerId}</Text>
        {item.analysisConfidence && (
          <Text>Confidence: {(item.analysisConfidence * 100).toFixed(1)}%</Text>
        )}
      </View>

      {item.originalImageUrl && (
        <View style={styles.imageContainer}>
          <Text style={styles.imageLabel}>Original Image (with bounding box info)</Text>
          <Image source={{ uri: item.originalImageUrl }} style={styles.originalImage} />
          <Text style={styles.boundingBoxText}>
            Box: ({item.boundingBox.x}, {item.boundingBox.y}) - 
            {item.boundingBox.width}×{item.boundingBox.height}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Universal Sherd Database</Text>
      
      {/* Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statText}>Total Sherds: {stats.totalSherds}</Text>
        <Text style={styles.statText}>Total Weight: {stats.totalWeight.toFixed(2)}g</Text>
        <Text style={styles.statText}>
          Projects: {Object.keys(stats.projectCounts).join(', ')}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by project (e.g., TH)"
          value={searchProject}
          onChangeText={setSearchProject}
        />
        <Button title="Search" onPress={fetchSherds} />
      </View>

      {/* Sherds List */}
      <FlatList
        data={sherds}
        keyExtractor={item => item.id}
        renderItem={renderSherd}
        refreshing={loading}
        onRefresh={fetchSherds}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No sherds found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  statsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  statText: {
    fontSize: 14,
    marginBottom: 4
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    marginRight: 8
  },
  sherdCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  sherdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sherdId: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  projectBadge: {
    backgroundColor: '#2196f3',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold'
  },
  sherdDetails: {
    marginBottom: 8
  },
  imageContainer: {
    marginTop: 8,
    alignItems: 'center'
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666'
  },
  originalImage: {
    width: 120,
    height: 120,
    borderRadius: 4,
    marginBottom: 4
  },
  boundingBoxText: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center'
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 32
  }
});