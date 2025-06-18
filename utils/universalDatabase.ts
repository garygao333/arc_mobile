import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface UniversalSherdData {
  sherdId: string;
  projectId: string; 
  
  studyAreaId: string;
  stratUnitId: string;
  containerId: string;
  objectGroupId: string;
  
  diagnosticType: string;
  qualificationType: string;
  weight: number;
  
  originalImageUrl?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  createdAt?: any;
  analysisConfidence?: number;
  notes?: string;
}

export class UniversalSherdDatabase {
  private static readonly COLLECTION_NAME = 'universal';

  private static removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  static async addSherd(sherdData: Omit<UniversalSherdData, 'createdAt'>): Promise<string> {
    try {
      const cleanedData = this.removeUndefinedFields({
        ...sherdData,
        createdAt: serverTimestamp(),
      });

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), cleanedData);
      
      console.log('Sherd added to universal database with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding sherd to universal database:', error);
      throw error;
    }
  }

  static async addSherdsFromAnalysis(
    sherds: Array<{
      sherd_id: string;
      weight: number;
      type_prediction: string;
      qualification_prediction: string;
      detection_id?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      confidence?: number;
    }>,
    originalImageBase64: string,
    projectData: {
      projectId: string;
      studyAreaId: string;
      stratUnitId: string;
      containerId: string;
      objectGroupId: string;
    }
  ): Promise<string[]> {
    const addedSherdIds: string[] = [];

    try {
      console.log(`Processing ${sherds.length} sherds for universal database...`);
      
      for (let i = 0; i < sherds.length; i++) {
        const sherd = sherds[i];
        console.log(`Processing sherd ${i + 1}/${sherds.length}: ${sherd.sherd_id}`);
        
        const boundingBox = {
          x: sherd.x || 0,
          y: sherd.y || 0,
          width: sherd.width || 100,
          height: sherd.height || 100,
        };

        const sherdData: Omit<UniversalSherdData, 'createdAt'> = {
          sherdId: sherd.sherd_id,
          projectId: projectData.projectId,
          studyAreaId: projectData.studyAreaId,
          stratUnitId: projectData.stratUnitId,
          containerId: projectData.containerId,
          objectGroupId: projectData.objectGroupId,
          diagnosticType: sherd.type_prediction,
          qualificationType: sherd.qualification_prediction,
          weight: sherd.weight,
          boundingBox,
          notes: `Detection ID: ${sherd.detection_id || 'unknown'}`
        };


        if (originalImageBase64) {
          sherdData.originalImageUrl = `data:image/jpeg;base64,${originalImageBase64}`;
        }
        
        if (sherd.confidence !== undefined && sherd.confidence !== null && !isNaN(sherd.confidence)) {
          sherdData.analysisConfidence = sherd.confidence;
        }

        try {
          const sherdId = await this.addSherd(sherdData);
          addedSherdIds.push(sherdId);
          console.log(`✓ Successfully added sherd ${sherd.sherd_id} to universal database`);
        } catch (sherdError) {
          console.error(`✗ Failed to add sherd ${sherd.sherd_id}:`, sherdError);
        }
      }

      console.log(`Successfully processed ${addedSherdIds.length}/${sherds.length} sherds for universal database`);
      return addedSherdIds;
    } catch (error) {
      console.error('Error processing sherds for universal database:', error);
      throw error;
    }
  }

  static async addManualSherd(
    sherdData: {
      diagnosticType: string;
      qualificationType: string;
      weight: number;
      count: number;
    },
    projectData: {
      projectId: string;
      studyAreaId: string;
      stratUnitId: string;
      containerId: string;
      objectGroupId: string;
    }
  ): Promise<string[]> {
    const addedSherdIds: string[] = [];

    try {
      for (let i = 0; i < sherdData.count; i++) {
        const universalSherdData: Omit<UniversalSherdData, 'createdAt'> = {
          sherdId: `${projectData.projectId}-${Date.now()}-${i}`,
          projectId: projectData.projectId,
          studyAreaId: projectData.studyAreaId,
          stratUnitId: projectData.stratUnitId,
          containerId: projectData.containerId,
          objectGroupId: projectData.objectGroupId,
          diagnosticType: sherdData.diagnosticType,
          qualificationType: sherdData.qualificationType,
          weight: sherdData.weight / sherdData.count, 
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          notes: 'Manual entry',
        };

        const sherdId = await this.addSherd(universalSherdData);
        addedSherdIds.push(sherdId);
      }

      console.log(`Added ${addedSherdIds.length} manual sherds to universal database`);
      return addedSherdIds;
    } catch (error) {
      console.error('Error adding manual sherds to universal database:', error);
      throw error;
    }
  }
}