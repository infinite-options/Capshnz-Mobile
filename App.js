// ios 713060649339-upijc3ft3a8goimhr8oei3r31k6nhgo9.apps.googleusercontent.com
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React, { createContext, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import WaitingRoom from './src/components/WatitingRoom';
import Waiting from './src/components/Waiting';
import SelectDeck from './src/components/SelectDeck';
import GameRules from './src/components/GameRules';
import GooglePhotos from './src/components/GooglePhotos';
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

export default function App() {
  const [show, setShow] = useState(false);
  const [onRetry, setOnRetry] = useState(() => {});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  
  return (
    // <GoogleOAuthProvider clientId="CLIENT_ID">
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Landing">
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
              <Stack.Screen name="GooglePhotos" component={GooglePhotos} />
              <Stack.Screen name="CnnDeck" component={CnnDeck} />
              
            </Stack.Navigator>
        </NavigationContainer>
        // </GoogleOAuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
