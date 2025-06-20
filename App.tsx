import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomePage from './screens/HomePage';
import ProjectPage from './screens/ProjectPage';
import StudyAreaPage from './screens/StudyAreaPage';
import StratUnitPage from './screens/StratUnitPage';
import MaterialContainerPage from './screens/MaterialContainerPage';
import MaterialEditPage from './screens/MaterialEditPage';
import MaterialGroupPage from './screens/MaterialGroupPage';
import UniversalDatabaseViewer from './components/UniversalDatabaseViewer';

export type RootStackParamList = {
  Home: undefined;
  UniversalDatabase: undefined;
  Project: { projectId: string };
  StudyArea: { projectId: string; studyAreaId: string };
  StratUnit: { projectId: string; studyAreaId: string; suId: string };
  MaterialContainer: {
    projectId: string;
    studyAreaId: string;
    suId: string;
    containerId: string;
  };
  MaterialGroup: {
    projectId: string;
    studyAreaId: string;
    suId: string;
    containerId: string;
    groupId: string;
  };
  MaterialEdit: {
    projectId: string;
    studyAreaId: string;
    suId: string;
    containerId: string;
    groupId: string;
    initialSherds: Array<{
      sherd_id: string;
      weight: number;
      type_prediction: string;
      qualification_prediction: string;
    }>;
    annotatedImage?: string;
    fromImage?: boolean;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen    name="UniversalDatabase" component={UniversalDatabaseViewer} options={{ title: "Universal Sherd Database" }} />
        <Stack.Screen name="Project" component={ProjectPage} />
        <Stack.Screen name="StudyArea" component={StudyAreaPage} />
        <Stack.Screen name="StratUnit" component={StratUnitPage} />
        <Stack.Screen name="MaterialContainer" component={MaterialContainerPage} />
        <Stack.Screen name="MaterialGroup" component={MaterialGroupPage} />
        <Stack.Screen name="MaterialEdit" component={MaterialEditPage} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}