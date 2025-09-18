import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GameProvider } from '@/providers/GameProvider';
import { DifficultyScreen } from '@/screens/DifficultyScreen';
import { GameplayScreen } from '@/screens/GameplayScreen';
import { ResultScreen } from '@/screens/ResultScreen';
import { SongSelectScreen } from '@/screens/SongSelectScreen';
import { TitleScreen } from '@/screens/TitleScreen';
import { RootStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <GameProvider>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Title" component={TitleScreen} />
            <Stack.Screen name="SongSelect" component={SongSelectScreen} />
            <Stack.Screen name="Difficulty" component={DifficultyScreen} />
            <Stack.Screen name="Gameplay" component={GameplayScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
          </Stack.Navigator>
        </GameProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
