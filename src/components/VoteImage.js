import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Button, Alert, StyleSheet, Dimensions, AppState } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
//import { useCookies } from 'react-cookie';

import { getSubmittedCaptions, postVote, sendError, getScoreBoard } from '../util/Api';
import useAbly from '../util/ably';
import { ErrorContext } from "../../App";
import LoadingScreen from './LoadingScreen';
import { handleApiError } from '../util/ApiHelper';
import Axios from 'axios';
import { getCurrentRound } from "../util/Api";
import AsyncStorage from '@react-native-async-storage/async-storage';
//import { Worker } from 'react-native-workers';



// This function is made to shuffle the sequence of the captions array.
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function VoteImage() {

  console.log("VoteImage Page");
 
  const navigation = useNavigation();
  const [appState, setAppState] = useState(AppState.currentState);
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  //const [cookies, setCookie] = setCookie(['userData']);
  const { publish, subscribe, unSubscribe, detach } = useAbly(userData.gameCode);

  const [captions, setCaptions] = useState([]);
  const [toggles, setToggles] = useState([]);
  const [isMyCaption, setIsMyCaption] = useState('');
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [votedCaption, setVotedCaption] = useState(-1);
  const [remainingTime, setRemainingTime] = useState(10);
  const [isPageVisible, setPageVisibility] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(userData.roundTime || 60);
  const [loadSpinner, setLoadSpinner] = useState(false);
  const [loadingImg, setLoadingImg] = useState(true);
  
  
  //const webWorker  = new Worker(new URL('../workers/api-worker.js', import.meta.url))
  

  

  // console.log("Vote Image Page - roundNumber", roundNumber)
  // console.log("Vote Image Page - midGameTimeStamp", midGameTimeStamp)
  // console.log("Vote Image Page - imageURL", imageURL)
  console.log("Vote Image Page - userData", userData)


  
  const backgroundColors = {
    default: '#D4B551',
    selected: 'Green',
    myCaption: 'black',
  };
  
  const isGameEnded = useRef(false);
  const isCaptionSubmitted = useRef(false);
  const context = useContext(ErrorContext);

  const shuffledCaptions = useMemo(() => shuffleArray(captions), [captions]);
/*
  if (cookies.userData != undefined //&& cookies.userData.imageURL !== userData.imageURL
    ) {
    async function sendingError() {
      let code1 = 'Vote Page';
      let code2 = 'userData.imageURL does not match cookies.userData.imageURL';
      await sendError(code1, code2);
    }
    // sendingError()
  }
*/

const setItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting item:', error);
  }
};

const getItem = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value != null ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error getting item:', error);
  }
};

  async function scoreBoard() {
    const scoreboard = await getScoreBoard(userData);
    scoreboard.sort((a, b) => b.game_score - a.game_score);
    return scoreboard;
  }

  async function setSubmittedCaptions(submittedCaptions) {
    let tempCaptions = [];
    let tempToggles = [];
    let myCaption = '';
    let onlyCaptionSubmitted = '';

    for (let i = 0; i < submittedCaptions.length; i++) {
      if (submittedCaptions[i].caption === '') continue;
      if (submittedCaptions[i].round_user_uid === userData.playerUID) myCaption = submittedCaptions[i].caption;
      if (submittedCaptions[i].caption !== '') onlyCaptionSubmitted = submittedCaptions[i].caption;
      tempCaptions.push(submittedCaptions[i].caption);
    }

    for (let i = 0; i < tempCaptions.length; i++) {
      tempToggles.push(false);
    }

    setCaptions(tempCaptions);
    setToggles(tempToggles);
    setIsMyCaption(myCaption);
    const updatedUserData = { ...userData, captions: submittedCaptions };
   // setCookie('userData', updatedUserData, { path: '/' });
   console.log('Vote image line 129- setSubmittedCaptions ',updatedUserData);
   console.log('before skip vote');
    if (tempCaptions.length <= 1) {
      console.log('if skip vote');
      await skipVote(tempCaptions, onlyCaptionSubmitted, myCaption);
    }
  }

  async function skipVote(tempCaptions, onlyCaptionSubmitted, myCaption) {
    if (tempCaptions.length === 1 && onlyCaptionSubmitted === myCaption) {
      await postVote(null, userData);
    } else if (tempCaptions.length === 1 && onlyCaptionSubmitted !== myCaption) {
      await postVote(onlyCaptionSubmitted, userData);
    } else if (tempCaptions.length === 0) {
      await postVote(null, userData);
    }
   // setCookie('userData', userData, { path: '/' });
   console.log('In VoteImage going to ScoreBoard 1',userData);
   navigation.navigate('ScoreBoardNew', {...userData });
   /*
    navigation.navigate({
      name: "ScoreboardNew",
      params: {...userData},
      key: 'ScoreboardNew-${Date.now()}', // Use a unique key
    });
    */
  }

  useEffect(() => {
    if (captions.length === 0 //&& cookies.userData.captions != undefined
        ) {
      setLoadingImg(false);
     // setSubmittedCaptions(cookies.userData.captions);
      isCaptionSubmitted.current = true;
    }

    if (userData.host) {
      async function getCaptions() {
        const submittedCaptions = await getSubmittedCaptions(userData);
        await publish({
          data: {
            message: 'Set Vote',
            submittedCaptions: submittedCaptions,
            roundNumber: userData.roundNumber,
            imageURL: userData.imageURL,
          },
        });
      }
      getCaptions();
    }

    subscribe((event) => {
      if (event.data.message === 'Set Vote') {
        isCaptionSubmitted.current = true;
        setLoadingImg(false);
        setSubmittedCaptions(event.data.submittedCaptions);
      } else if (event.data.message === 'Start ScoreBoard') {
        handleNavigate() ;
      }
    });
  }, [userData]);

  const handleNavigate = async () => {
    console.log("handleNavigate");
  //  setCookie('userData', userData, { path: '/' });
    console.log(AppState.currentState);
    if(AppState.currentState === "active" && !userData.host ){
      //setItem("isOutofSync", true)
      await AsyncStorage.setItem('isOutOfSync', 'true');
    }  
    //setItem("isOutofSync", false);
       //let isDeSync = getItem('isOutOfSync');
    await AsyncStorage.setItem('isOutOfSync', 'false');

 
    
    const isDeSync = await getItem('isOutOfSync');

    console.log(' Waiting Room -isDeSync',isDeSync);

    if (!isDeSync) {
      setItem('votepage-minimize-time', 0);
      setItem('remaining-time-votePage', 0);
      console.log('In Vote Image going to ScoreBoard 2',userData);
    
     navigation.navigate('ScoreBoardNew', {...userData });
     /*
      navigation.navigate({
        name: "ScoreboardNew",
        params: {...userData},
        key: 'ScoreboardNew-${Date.now()}', // Use a unique key
      });
      */
     
    } else {
      if (!userData.host) {
        console.log("if statement going to mid game waiting room")
        setLoadSpinner(true);
       // setItem('isOutOfSync', false);
       await AsyncStorage.setItem('isOutOfSync', 'false');
        setTimeout(() => {
          // navigation.nagivate('MidGameWaitingRoom', {...userData });
           navigation.navigae('MidGameWaitingRoom', {...userData});
           /*
           navigation.navigate({
            name: "MidGameWaitingRoom",
            params: {...userData},
            key: 'MidGameWaitingRoom-${Date.now()}', // Use a unique key
            
          }); */
        }, 2000); 
      }
    }
  };

  useEffect(() => {
   // localStorage.removeItem('user-caption');
    subscribe((event) => {
      if (event.data.message === 'EndGame vote') {
        detach();
        if (!userData.host && !isGameEnded.current) {
          isGameEnded.current = true;
          Alert.alert('Host has Ended the game');
        }
        const updatedUserData = { ...userData, scoreBoard: event.data.scoreBoard };
        setUserData(updatedUserData);
     //   setCookie('userData', updatedUserData, { path: '/' });
        navigation.navigate('FinalScore', {...updatedUserData });
      }
    });
  }, []);

  async function getCaptionsForUser() {
    const submittedCaptions = await getSubmittedCaptions(userData);
    setLoadingImg(false);
    setSubmittedCaptions(submittedCaptions);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isCaptionSubmitted.current) {
        getCaptionsForUser();
        isCaptionSubmitted.current = true;
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      unSubscribe();
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('nextAppState',nextAppState);
      if (nextAppState.match(/inactive|background/)) {
        // App is in background
        setTimeRemaining(timeRemaining);
        setItem('votepage-minimize-time', new Date().getTime().toString());
        setItem('remaining-time-votePage', remainingTime.toString());
     //   webWorker.postMessage(["vote-page", userData, remainingTime,null]);
        setPageVisibility(false);
      } else {
        // App is in foreground
       // webWorker.postMessage("exit");
       // setItem('isOutOfSync', 'false');
        await AsyncStorage.setItem('isOutOfSync', 'false');
        const minimizeTime = parseInt(getItem('votepage-minimize-time'), 10);
        const currentTime = new Date().getTime();
        const diff = Math.floor((currentTime - minimizeTime) / 1000);
        setTimeRemaining(timeRemaining - diff);
        setPageVisibility(true);
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
        //AppState.removeEventListener('change', handleAppStateChange);
        subscription.remove();
    };
  }, [timeRemaining, remainingTime]);


  async function closeButton() {
    try {
      let scoreboard = userData.scoreBoardEnd;
      if (scoreboard === undefined) {
        scoreboard = await scoreBoard();
        for (let i = 0; i < scoreboard.length; i++) {
          scoreboard[i].game_score = 0;
        }
      }
      await publish({
        data: {
          message: 'EndGame vote',
          scoreBoard: scoreboard,
        },
      });
    } catch (error) {
      handleApiError(error, closeButton, context);
    }
  }

  function updateToggles(index) {
    console.log("Index ",index);
    console.log(captions[index] );
    console.log(isMyCaption);
    if (captions[index] === isMyCaption) {
      Alert.alert('You cannot vote for your own caption');
      return;
    }
    const updatedToggles = toggles.map((toggle, i) => (i === index ? !toggle : toggle));
    setToggles(updatedToggles);
    setVoteSubmitted(true);
    voteButton(index);
  }

  async function voteButton(selectedCaptionIndex) {
    try {

        console.log("inside VoteButton");
        let numOfPlayersVoting = -1;
        setVoteSubmitted(true);

        let selectedCaption = null;
        if(selectedCaptionIndex > -1){
          selectedCaption = captions[selectedCaptionIndex];
        }

        numOfPlayersVoting = await postVote(selectedCaption, userData);

        console.log("afer postvote in  VoteButton functin");
        console.log('numOfPlayersVoting ',numOfPlayersVoting);
        console.log('selectedCaptionIndex ',selectedCaptionIndex);
        
        if (numOfPlayersVoting === 0 || selectedCaptionIndex == -1) {
          let publishTimer = 0;
          if(numOfPlayersVoting != 0)  publishTimer = 5000;
          function timeout() {
            console.log("inside timeout function"); 
            setTimeout(async () => {
            await publish({ data: { message: "Start ScoreBoard", roundNumber: userData.roundNumber } });
        } , publishTimer); // 5000 milliseconds = 5 seconds

        console.log("after timeout function"); 
      }
      console.log("here line 436 numOfPlayersVoting : ",numOfPlayersVoting )
      if(userData.host || numOfPlayersVoting === 0 || selectedCaptionIndex === -1) 
        timeout();
      }
    } catch (error) {
      handleApiError(error, voteButton, context);
    }
  }

  function getBackgroundColor(status) {
    return backgroundColors[status];
  }

  console.log("Vote Image",userData);
  return (
    <View style={styles.container}>
      
      {loadSpinner && <LoadingScreen />}
      {loadingImg ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Image style={styles.image} source={{ uri: userData.imageURL }} />
          <CountdownCircleTimer
            size={76}
            strokeWidth={5}
            isPlaying
            duration={timeRemaining}
            onComplete={handleNavigate}
            colors={['#004777', '#F7B801', '#A30000', '#A30000']}
            colorsTime={[30, 20, 10, 0]}
          >
            {({ remainingTime }) => <Text style={styles.timerText}>{remainingTime}s</Text>}
          </CountdownCircleTimer>
          {shuffledCaptions.map((caption, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => updateToggles(index)}
              style={[
                styles.captionContainer,
                { backgroundColor: toggles[index] ? backgroundColors.selected : backgroundColors.default }
              ]}
            >
              <Text style={styles.captionText}>{caption}</Text>
            </TouchableOpacity>
          ))}
          {/*
          <View style={styles.buttonContainer}>
            <Button title="Submit Vote" onPress={closeButton} disabled={!voteSubmitted} />
            </View> */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: Dimensions.get('window').width * 0.9,
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 20,
  },
  captionContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: '100%',
  },
  captionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
  },
  timerText: {
    fontSize: 22,
    color: '#fff',
  },
});



