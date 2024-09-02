
// ios 713060649339-upijc3ft3a8goimhr8oei3r31k6nhgo9.apps.googleusercontent.com
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React, {useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Landing from './src/components/Landing'; 
import EnterName from './src/components/EnterName';
import StartGame from './src/components/StartGame';
import VerificationOtp from './src/components/VerficationOtp';
import ChooseScoring from './src/components/ChooseScoring';
import ChooseRounds from './src/components/ChooseRounds';
import WaitingRoom from './src/components/WatitingRoom';
import SelectDeck from './src/components/SelectDeck';
import JoinGame from './src/components/JoinGame';
import GooglePhotos from './src/components/GooglePhotos';
import CaptionNew from './src/components/CaptionNew';
import ScoreBoardNew from './src/components/ScoreBoardNew';
import VoteImage from './src/components/VoteImage';
import FinalScore from './src/components/FinalScore';
import UserInfo from './src/components/UserInfo';
import Feedback from './src/components/Feedback';
import GameRules from './src/components/GameRules';
import Confirmation from './src/components/Confirmation';
import LoadingScreen from './src/components/LoadingScreen';
import MidGameWaitingRoom from './src/components/MidGameWaitingRoom';
import CnnDeck from './src/components/CnnDeck';
import TransitionPage from './src/components/TransitionPage.js';
import TransitionPage1 from './src/components/TransitionPage1.js';
import TransitionPage2 from './src/components/TransitionPage2.js';
import TransitionPage3 from './src/components/TransitionPage3.js';



// import Waiting from './src/components/Waiting';
// 


// import { GoogleOAuthProvider } from '@react-oauth/google';
// import { GoogleLogin } from '@react-oauth/google';
// // import { useGoogleLogin } from '@react-oauth/google';
// //import { GoogleLogin,GoogleOAuthProvider } from '@react-oauth/google';
// //import axios from '../util/config';
// import { CLIENT_ID } from '@env';
// import { CLIENT_SECRET } from '@env';


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
              <Stack.Screen name="EnterName" component={EnterName} />
              <Stack.Screen name="StartGame" component={StartGame} />
              <Stack.Screen name="VerificationOtp" component={VerificationOtp} />
              <Stack.Screen name="ChooseScoring" component={ChooseScoring} />
              <Stack.Screen name="ChooseRounds" component={ChooseRounds} />

              <Stack.Screen name="TransitionPage" component={TransitionPage} />
              <Stack.Screen name="TransitionPage1" component={TransitionPage1} />
              <Stack.Screen name="TransitionPage2" component={TransitionPage2} />
              <Stack.Screen name="TransitionPage3" component={TransitionPage3} />

              <Stack.Screen name="WaitingRoom" component={WaitingRoom} />
              <Stack.Screen name="SelectDeck" component={SelectDeck} /> 
              <Stack.Screen name="JoinGame" component={JoinGame} />
              <Stack.Screen name="GooglePhotos" component={GooglePhotos} />
              <Stack.Screen name="CaptionNew" component={CaptionNew} />
              <Stack.Screen name="ScoreBoardNew" component={ScoreBoardNew} />
              <Stack.Screen name="VoteImage" component={VoteImage} />
              <Stack.Screen name="FinalScore" component={FinalScore} />
              <Stack.Screen name="MidGameWaitingRoom" component={MidGameWaitingRoom} />
              <Stack.Screen name="LoadingScreen" component={LoadingScreen} />
              <Stack.Screen name="Feedback" component={Feedback} />
              <Stack.Screen name="UserInfo" component={UserInfo} />
              <Stack.Screen name="Confirmation" component={Confirmation} />
              <Stack.Screen name="GameRules" component={GameRules} />
              <Stack.Screen name="CnnDeck" component={CnnDeck} />
             
              {/* 

              <Stack.Screen name="Waiting" component={Waiting} />
 
              */}
              
        
            </Stack.Navigator>
        </NavigationContainer>
       
  );
}
