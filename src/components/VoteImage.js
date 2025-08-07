import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, Dimensions, AppState } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CountdownCircleTimer } from 'react-native-countdown-circle-timer';
import { getSubmittedCaptions, postVote, getScoreBoard } from '../util/Api';
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
  const [timeRemaining, setTimeRemaining] = useState(userData.roundTime || 60);
  const [loadSpinner, setLoadSpinner] = useState(false);
  const [loadingImg, setLoadingImg] = useState(true);
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

  async function setSubmittedCaptions(submittedCaptions) {
    let tempCaptions = [];
    let myCaption = '';
    let onlyCaptionSubmitted = '';

    for (let i = 0; i < submittedCaptions.length; i++) {
      if (submittedCaptions[i].caption === '') continue;
      if (submittedCaptions[i].round_user_uid === userData.playerUID) myCaption = submittedCaptions[i].caption;
      if (submittedCaptions[i].caption !== '') onlyCaptionSubmitted = submittedCaptions[i].caption;
      tempCaptions.push(submittedCaptions[i].caption);
    }

    setCaptions(tempCaptions);
    setToggles(new Array(tempCaptions.length).fill(false));
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
      (async () => {
        const submittedCaptions = await getSubmittedCaptions(userData);
        await publish({
          data: {
            message: 'Set Vote',
            submittedCaptions,
            roundNumber: userData.roundNumber,
            imageURL: userData.imageURL,
          },
        });
      })();
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
    await AsyncStorage.setItem('isOutOfSync', 'false');
    const isDeSync = await getItem('isOutOfSync');
    if (!isDeSync) {
      setItem('votepage-minimize-time', 0);
      setItem('remaining-time-votePage', 0);
      navigation.navigate('ScoreBoardNew', { ...userData });
    } else {
      if (!userData.host) {
        setLoadSpinner(true);
        await AsyncStorage.setItem('isOutOfSync', 'false');
        setTimeout(() => {
          navigation.navigate('MidGameWaitingRoom', { ...userData });
        }, 2000);
      }
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isCaptionSubmitted.current) {
        (async () => {
          const submittedCaptions = await getSubmittedCaptions(userData);
          setLoadingImg(false);
          setSubmittedCaptions(submittedCaptions);
        })();
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
        setItem('votepage-minimize-time', new Date().getTime().toString());
        setItem('remaining-time-votePage', timeRemaining.toString());
      } else {
        await AsyncStorage.setItem('isOutOfSync', 'false');
        const minimizeTime = parseInt(await getItem('votepage-minimize-time'), 10);
        const diff = Math.floor((Date.now() - minimizeTime) / 1000);
        setTimeRemaining((prev) => Math.max(prev - diff, 0));
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [timeRemaining]);

  async function voteButton(selectedCaptionIndex) {
    try {
      setVoteSubmitted(true);
      const selectedCaption = selectedCaptionIndex > -1 ? captions[selectedCaptionIndex] : null;
      const numOfPlayersVoting = await postVote(selectedCaption, userData);

      if (numOfPlayersVoting === 0 || selectedCaptionIndex === -1) {
        setTimeout(async () => {
          await publish({ data: { message: "Start ScoreBoard", roundNumber: userData.roundNumber } });
        }, numOfPlayersVoting !== 0 ? 5000 : 0);
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
  if (voteSubmitted) return; // Prevent multiple votes
  setToggles(toggles.map((t, i) => i === index)); // Only one selected
  setVoteSubmitted(true);
  voteButton(index);
}

  const backgroundColors = {
    default: '#D4B551',
    selected: 'green',
    disabled: '#ccc',
  };

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

          {shuffledCaptions.map((caption, index) => {
  const isOwnCaption = caption === isMyCaption;
  const isSelected = toggles[index];
  return (
    <TouchableOpacity
      key={index}
      onPress={() => updateToggles(index)}
      disabled={isOwnCaption || voteSubmitted}
      style={[
        styles.captionContainer,
        {
          backgroundColor: isOwnCaption
            ? backgroundColors.disabled
            : isSelected
            ? backgroundColors.selected
            : backgroundColors.default,
          opacity: voteSubmitted && !isSelected ? 0.6 : 1,
        }
      ]}
    >
      <Text
        style={[
          styles.captionText,
          isOwnCaption && styles.disabledCaptionText
        ]}
      >
        {caption}
      </Text>
    </TouchableOpacity>
  );
})}
      {voteSubmitted && (
  <Text style={{ marginTop: 10, color: 'green', fontWeight: 'bold' }}>
    Vote submitted! Waiting for others...
  </Text>
)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#aab6f5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
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
    borderRadius: 10,
    resizeMode: 'contain',
  },
  captionContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
  },
  captionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#222',
  },
  disabledCaptionText: {
    color: '#666',
    fontStyle: 'italic',
  },
  timerText: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
});
