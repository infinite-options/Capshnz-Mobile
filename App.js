import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform } from 'react-native';
import React, { createContext, useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Landing from './src/components/Landing'; 
import UserInfo from './src/components/UserInfo';
import EnterName from './src/components/EnterName';
import JoinGame from './src/components/JoinGame';
import Confirmation from './src/components/Confirmation';
import VerificationOtp from './src/components/VerficationOtp';
import StartGame from './src/components/StartGame';
import ChooseScoring from './src/components/ChooseScoring';
import Feedback from './src/components/Feedback';
import ChooseRounds from './src/components/ChooseRounds';
import WaitingRoom from './src/components/WaitingRoom';
import Waiting from './src/components/Waiting';
import SelectDeck from './src/components/SelectDeck';
import GameRules from './src/components/GameRules';
import GooglePhotos from './src/components/GooglePhotos';
import GooglePhotosWithPicker from './src/components/GooglePhotosWithPicker';
import GooglePhotosWeb from './src/components/GooglePhotosWeb';
import CaptionNew from './src/components/CaptionNew';
import LoadingScreen from './src/components/LoadingScreen';
import ScoreBoardNew from './src/components/ScoreBoardNew';
import FinalScore from './src/components/FinalScore';
import MidGameWaitingRoom from './src/components/MidGameWaitingRoom';
import VoteImage from './src/components/VoteImage';
import CnnDeck from './src/components/CnnDeck';


// import { GoogleOAuthProvider } from '@react-oauth/google';
// import { GoogleLogin } from '@react-oauth/google';
// // import { useGoogleLogin } from '@react-oauth/google';
// //import { GoogleLogin,GoogleOAuthProvider } from '@react-oauth/google';
// //import axios from '../util/config';
// import { CLIENT_ID } from '@env';
// import { CLIENT_SECRET } from '@env';
// console.log("client id: ", CLIENT_ID);

export const ErrorContext = createContext();

const Stack = createNativeStackNavigator();

const CURRENT_ACCESS_TOKEN = "currentAccessToken";
const CURRENT_PROFILE = "currentProfile";

export default function App() {

  const [show, setShow] = useState(false);
  const [onRetry, setOnRetry] = useState(() => {});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Landing');

  useEffect(() => {
    checkAuthenticationStatus();
  }, []);

  const checkAuthenticationStatus = async () => {
    try {
      console.log("🔍 App.js: Checking authentication on startup...");
      console.log("🔍 Platform:", Platform.OS);
      

      // Check authentication
      const [accessToken, profile] = await Promise.all([
        AsyncStorage.getItem(CURRENT_ACCESS_TOKEN),
        AsyncStorage.getItem(CURRENT_PROFILE)
      ]);

      console.log("🔑 Auth check results:", {
        hasToken: !!accessToken,
        hasProfile: !!profile
      });

      if (accessToken && profile) {
        console.log("✅ User is authenticated - will show PhotoPicker");
        setIsAuthenticated(true);
        setInitialRoute('GooglePhotosWithPicker');
      } else {
        console.log("ℹ️ User not authenticated - will show Landing");
        setIsAuthenticated(false);
        setInitialRoute('Landing');
      }
    } catch (error) {
      console.error("❌ Error checking authentication:", error);
      setInitialRoute('Landing');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#46C3A6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
              <Stack.Screen name="Landing" component={Landing} />
              <Stack.Screen name="GameRules" component={GameRules} />
              <Stack.Screen name="EnterName" component={EnterName} />
              <Stack.Screen name="VerificationOtp" component={VerificationOtp} />
              <Stack.Screen name="StartGame" component={StartGame} />
              <Stack.Screen name="ChooseScoring" component={ChooseScoring} />
              <Stack.Screen name="ChooseRounds" component={ChooseRounds} />
              <Stack.Screen name="WaitingRoom" component={WaitingRoom} />
              <Stack.Screen name="JoinGame" component={JoinGame} />
              <Stack.Screen name="Waiting" component={Waiting} />
              <Stack.Screen name="CaptionNew" component={CaptionNew} />
              <Stack.Screen name="LoadingScreen" component={LoadingScreen} />
              <Stack.Screen name="ScoreBoardNew" component={ScoreBoardNew} />
              <Stack.Screen name="FinalScore" component={FinalScore} />
              <Stack.Screen name="MidGameWaitingRoom" component={MidGameWaitingRoom} />
              <Stack.Screen name="VoteImage" component={VoteImage} />
              <Stack.Screen name="Feedback" component={Feedback} />         
              <Stack.Screen name="UserInfo" component={UserInfo} />
              <Stack.Screen name="Confirmation" component={Confirmation} />
              <Stack.Screen name="SelectDeck" component={SelectDeck} />
              <Stack.Screen name="GooglePhotosWithPicker" component={GooglePhotosWithPicker} />
              <Stack.Screen name="GooglePhotosWeb" component={GooglePhotosWeb} />
              <Stack.Screen name="CnnDeck" component={CnnDeck} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


  
//   return (
//     // <GoogleOAuthProvider clientId="CLIENT_ID">
//         <NavigationContainer>
//             <Stack.Navigator initialRouteName="Landing">
//               <Stack.Screen name="Landing" component={Landing} />
//               <Stack.Screen name="GameRules" component={GameRules} />
//               <Stack.Screen name="EnterName" component={EnterName} />
//               <Stack.Screen name="VerificationOtp" component={VerificationOtp} />
//               <Stack.Screen name="StartGame" component={StartGame} />
//               <Stack.Screen name="ChooseScoring" component={ChooseScoring} />
//               <Stack.Screen name="ChooseRounds" component={ChooseRounds} />
//               <Stack.Screen name="WaitingRoom" component={WaitingRoom} />
//               <Stack.Screen name="JoinGame" component={JoinGame} />
//               <Stack.Screen name="Waiting" component={Waiting} />
//               <Stack.Screen name="CaptionNew" component={CaptionNew} />
//               <Stack.Screen name="LoadingScreen" component={LoadingScreen} />
//               <Stack.Screen name="ScoreBoardNew" component={ScoreBoardNew} />
//               <Stack.Screen name="FinalScore" component={FinalScore} />
//               <Stack.Screen name="MidGameWaitingRoom" component={MidGameWaitingRoom} />
//               <Stack.Screen name="VoteImage" component={VoteImage} />
//               <Stack.Screen name="Feedback" component={Feedback} />         
//               <Stack.Screen name="UserInfo" component={UserInfo} />
//               <Stack.Screen name="Confirmation" component={Confirmation} />
//               <Stack.Screen name="SelectDeck" component={SelectDeck} />
//               <Stack.Screen name="GooglePhotosWithPicker" component={GooglePhotosWithPicker} />
//               <Stack.Screen name="CnnDeck" component={CnnDeck} />
              
//             </Stack.Navigator>
//         </NavigationContainer>
//         // </GoogleOAuthProvider>
//   );
// }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
