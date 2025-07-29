import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Button, Alert, StyleSheet, Dimensions, AppState } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import { getSubmittedCaptions, postVote, sendError, getScoreBoard } from '../util/Api';
import useAbly from '../util/ably';
import { ErrorContext } from "../../App";
import LoadingScreen from './LoadingScreen';
import { handleApiError } from '../util/ApiHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

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

  const backgroundColors = {
    default: '#D4B551',
    selected: 'green',
    myCaption: '#888888',
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
    navigation.navigate('ScoreBoardNew', { ...userData });
  }

  useEffect(() => {
    if (captions.length === 0) {
      setLoadingImg(false);
    }

    if (userData.host) {
      async function getCaptions() {
        const submittedCaptions = await getSubmittedCaptions(userData);
        await publish({
          data: {
            message: 'Set Vote',
            submittedCaptions,
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
        handleNavigate();
      }
    });
  }, [userData]);

  const handleNavigate = async () => {
    if (AppState.currentState === 'active' && !userData.host) {
      await AsyncStorage.setItem('isOutOfSync', 'true');
    }
    await AsyncStorage.setItem('isOutOfSync', 'false');

    const isDeSync = await getItem('isOutOfSync');

    if (!isDeSync) {
      setItem('votepage-minimize-time', 0);
      setItem('remaining-time-votePage', 0);
      navigation.navigate('ScoreBoardNew', { ...userData });
    } else if (!userData.host) {
      setLoadSpinner(true);
      await AsyncStorage.setItem('isOutOfSync', 'false');
      setTimeout(() => {
        navigation.navigate('MidGameWaitingRoom', { ...userData });
      }, 2000);
    }
  };

  useEffect(() => {
    subscribe((event) => {
      if (event.data.message === 'EndGame vote') {
        detach();
        if (!userData.host && !isGameEnded.current) {
          isGameEnded.current = true;
          Alert.alert('Host has Ended the game');
        }
        const updatedUserData = { ...userData, scoreBoard: event.data.scoreBoard };
        setUserData(updatedUserData);
        navigation.navigate('FinalScore', { ...updatedUserData });
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
        setTimeRemaining(timeRemaining);
        setItem('votepage-minimize-time', new Date().getTime().toString());
        setItem('remaining-time-votePage', remainingTime.toString());
        setPageVisibility(false);
      } else {
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
    return () => subscription.remove();
  }, [timeRemaining, remainingTime]);

  async function voteButton(selectedCaptionIndex) {
    try {
      let selectedCaption = null;
      if (selectedCaptionIndex > -1) {
        selectedCaption = captions[selectedCaptionIndex];
      }
      const numOfPlayersVoting = await postVote(selectedCaption, userData);
      if (numOfPlayersVoting === 0 || selectedCaptionIndex === -1) {
        const publishTimer = numOfPlayersVoting !== 0 ? 5000 : 0;
        if (userData.host || numOfPlayersVoting === 0 || selectedCaptionIndex === -1) {
          setTimeout(async () => {
            await publish({ data: { message: "Start ScoreBoard", roundNumber: userData.roundNumber } });
          }, publishTimer);
        }
      }
    } catch (error) {
      handleApiError(error, voteButton, context);
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

  return (
    <View style={styles.container}>
      {loadSpinner && <LoadingScreen />}
      {loadingImg ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <Image
           style={styles.image} 
           source={{ uri: userData.imageURL }} />
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
          {shuffledCaptions.map((caption, index) => {
            const isOwnCaption = caption === isMyCaption;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => !isOwnCaption && updateToggles(index)}
                style={[
                  styles.captionContainer,
                  {
                    backgroundColor: isOwnCaption
                      ? backgroundColors.myCaption
                      : toggles[index]
                      ? backgroundColors.selected
                      : backgroundColors.default,
                    opacity: isOwnCaption ? 0.5 : 1,
                  },
                ]}
                disabled={isOwnCaption}
              >
                <Text style={[styles.captionText, isOwnCaption && styles.disabledText]}>{caption}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

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
  timerText: {
    fontSize: 22,
    color: '#fff',
  },
  disabledText: {
    color: '#aaa',
    fontStyle: 'italic',
  },
});
