import React, { createContext,useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Button, Alert, StyleSheet, Dimensions, AppState,TextInput } from 'react-native';
import { useNavigation, useRoute,useFocusEffect } from '@react-navigation/native';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import { getSubmittedCaptions, postVote, sendError, getScoreBoard } from '../util/Api';
import useAbly from '../util/ably';
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
export const ErrorContext = createContext();

export default function VoteImage() {


  const navigation = useNavigation();
  const [appState, setAppState] = useState(AppState.currentState);
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
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
 
  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );



  
  const backgroundColors = {
    default: '#D4B551',
    selected: 'Green',
    myCaption: 'black',
  };
  
  const isGameEnded = useRef(false);
  const isCaptionSubmitted = useRef(false);
  const context = useContext(ErrorContext);

  const shuffledCaptions = useMemo(() => shuffleArray(captions), [captions]);

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
    if (tempCaptions.length <= 1) {
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
   navigation.navigate('ScoreBoardNew', {...userData });
  }

  useEffect(() => {
    if (captions.length === 0 //&& cookies.userData.captions != undefined
        ) {
      setLoadingImg(false);
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
    if(AppState.currentState === "active" && !userData.host ){

      await AsyncStorage.setItem('isOutOfSync', 'true');
    }  

    await AsyncStorage.setItem('isOutOfSync', 'false');

 
    
    const isDeSync = await getItem('isOutOfSync');

    if (!isDeSync) {
      setItem('votepage-minimize-time', 0);
      setItem('remaining-time-votePage', 0);
     // navigation.navigate('ScoreBoardNew', {...userData });
      navigation.reset({
        index: 0,
        routes: [{ name: "ScoreBoardNew", params: {...userData} }],
      });
     
    } else {
      if (!userData.host) {
        setLoadSpinner(true);
    
       await AsyncStorage.setItem('isOutOfSync', 'false');
        setTimeout(() => {
           navigation.reset({
            index: 0,
            routes: [{ name: "MidGameWaitingRoom", params: {...userData} }],
          });
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

        let numOfPlayersVoting = -1;
        setVoteSubmitted(true);

        let selectedCaption = null;
        if(selectedCaptionIndex > -1){
          selectedCaption = captions[selectedCaptionIndex];
        }

        numOfPlayersVoting = await postVote(selectedCaption, userData);
    
        if (numOfPlayersVoting === 0 || selectedCaptionIndex == -1) {
          let publishTimer = 0;
          if(numOfPlayersVoting != 0)  publishTimer = 5000;
          function timeout() {
        
            setTimeout(async () => {
            await publish({ data: { message: "Start ScoreBoard", roundNumber: userData.roundNumber } });
        } , publishTimer); // 5000 milliseconds = 5 seconds
      }
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

  return (
    <View style={styles.container}>
  
      <View style={styles.closeButtonContainer}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => navigation.navigate("StartGame", {...userData })}
                  >
                    
                    <Text style={styles.closeButtonText}>X</Text>
              </TouchableOpacity> 
       </View> 
      {loadSpinner && <LoadingScreen />}
      {loadingImg ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        
        <View style={styles.contentContainer}>


          <Image style={styles.image} source={{ uri: userData.imageURL }} />

          {voteSubmitted && (
                <View style={styles.submittedVote}>
                <Text style={styles.title}>Vote submitted.</Text>
                <Text style={styles.message}>Waiting for other players to submit votes...</Text>
              </View>
            )}
          <CountdownCircleTimer
            size={76}
            strokeWidth={5}
            isPlaying
            duration={timeRemaining}
            onComplete={handleNavigate}
            colors={['#004777', '#F7B801', '#A30000', '#A30000']}
            background="#566176"
            fontFamily="Arial"
            fontWeight="bold"
            colorsTime={[30, 20, 10, 0]}
          >
            {({ remainingTime }) => <Text style={styles.timerText}>{remainingTime}</Text>}
          </CountdownCircleTimer>

          {shuffledCaptions.map((caption, index) => {
                  let status = "";
                  if (caption === isMyCaption) status = "myCaption";
                  else if (toggles[index] === true) status = "selected";
                  else status = "default";
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => updateToggles(index)}
                      style={[
                        styles.captionContainer,
                        // { backgroundColor: toggles[index] ? backgroundColors.selected : backgroundColors.default }
                        { backgroundColor: getBackgroundColor(status),}
                      ]}
                    >
                      <Text style={styles.captionText}>{caption}</Text>
                    </TouchableOpacity>
                  );
                })}
            <View style={styles.centered}>
                  <Image
                        source={require('../assets/polygon-upward-white.png')}
                        style={styles.upwardPolygonLeft}
                    />
                  <TextInput style={styles.input} editable={false}>{userData.deckTitle}</TextInput>
            </View>  
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
    backgroundColor: '#878787',
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
    borderRadius: 25,
    marginTop: 40,
    width: '100%',
  },
  captionText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'white',
  },
  buttonContainer: {
    marginTop: 20,
  },
  timerText: {
    fontSize:16,
    color: '#fff',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  upwardPolygonLeft: {
    marginTop: -10,
    width: 50, 
    height: 50, 
    right: 100,
    bottom: -30,
  },
  input: {
    width: '90%',
    height: 55,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 10,
    borderRadius: 40,
  },
  submittedVote: {
    fontFamily: 'Grandstander', 
    fontSize: 20,
    textAlign: 'center', 
    marginVertical: 20, 
  },
  title: {
    fontFamily: 'Grandstander', 
    fontSize: 15,
    textAlign: 'center',
  },
  message: {
    marginVertical: 10, 
    fontFamily: 'Grandstander', 
    fontSize: 15,
    textAlign: 'center',
  },
  closeButton: {
   
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  closeButtonContainer: {
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 10,
  },
});



