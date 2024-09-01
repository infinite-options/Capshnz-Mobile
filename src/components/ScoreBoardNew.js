import React, { createContext,useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute,useFocusEffect } from "@react-navigation/native";
import useAbly from "../util/ably";
import { getScoreBoard, getNextImage, getGameScore } from "../util/Api";
import { handleApiError } from "../util/ApiHelper";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ErrorContext = createContext();
export default function ScoreBoardNew () {
 
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const { publish, subscribe, unSubscribe, detach } = useAbly(userData.gameCode);

  const [scoreBoard, setScoreBoard] = useState([]);
  const isGameEnded = useRef(false);
  const [isScoreBoard, setIsScoreBoard] = useState(false);
  const isScoreBoardDisplayed = useRef(false);
  const [loadingImg, setLoadingImg] = useState(true);
  const context = useContext(ErrorContext);

  
  if (scoreBoard.length === 0 && userData.scoreBoard !== undefined) {
    setLoadingImg(false);
    setScoreBoard(cookies.userData.scoreBoard);
  }

  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );
  
  useEffect(() => {
    if (!isScoreBoard && userData.host && userData.scoreBoard === undefined
      ) {
      async function setScoreBoard() {
        const scoreBoard = await getScoreBoard(userData);
        setLoadingImg(false);
        scoreBoard.sort((a, b) => b.votes - a.votes);
       
        setIsScoreBoard(true);
        publish({
          data: {
            message: "Set ScoreBoard",
            scoreBoard: scoreBoard,
          },
        });
      }
      setScoreBoard();
    }
  }, [userData, isScoreBoard]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScoreBoardDisplayed.current && scoreBoard.length === 0) {
        async function getScoreBoard() {
          const scoreboard = await getGameScore(userData.gameCode, userData.roundNumber);
          setLoadingImg(false);
          scoreboard.sort((a, b) => b.game_score - a.game_score);
          setScoreBoard(scoreboard);
          return scoreBoard;
        }
        getScoreBoard();
        isScoreBoardDisplayed.current = true;
      }
    }, 5000);

    return () => clearInterval(interval); // Clear interval to prevent memory leaks
  }, [scoreBoard]);

  async function closeButton() {
    await publish({
      data: {
        message: "EndGame scoreboard",
      },
    });
  }

  async function nextRoundButton() {
    try {
      const nextRound = userData.roundNumber + 1;
      const imageURL = await getNextImage(userData.gameCode, nextRound);
    
      await publish({
        data: {
          message: "Start Next Round",
          roundNumber: nextRound,
          imageURL: imageURL,
        },
      });
    } catch (error) {
      handleApiError(error, nextRoundButton, context);
    }
  }

  async function finalScoresButton() {
    await publish({ data: { message: "Start EndGame" } });
  }

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

  const removeItem = async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

 
const handleSubscription = async (subscribe, unSubscribe) => {
  
  await AsyncStorage.removeItem("user-caption");
  await AsyncStorage.setItem("minimize-time", "0");
 
  const handleEvent = (event) => {
 
  if (event.data.message === "Set ScoreBoard") {
      const updatedUserData = {
        ...userData,
        scoreBoard: event.data.scoreBoard,
      };
      const updatedEndUserData = {
        ...userData,
        scoreBoardEnd: event.data.scoreBoard,
      };
      setLoadingImg(false);
      setUserData(updatedEndUserData);
      // setCookie("userData", updatedUserData, { path: "/" });
      setScoreBoard(event.data.scoreBoard);
    } else if (event.data.message === "Start Next Round") {
      const updatedUserData = {
        ...userData,
        roundNumber: event.data.roundNumber,
        imageURL: event.data.imageURL,
      };
      setUserData(updatedUserData);

     navigation.reset({
      index: 0,
      routes: [{ name: "CaptionNew", params: {...updatedUserData} }],
    });

      

    } else if (event.data.message === "Start EndGame") {

      navigation.navigate("FinalScore", {...userData });
    }
  };

  subscribe(handleEvent);
  return () => {
    unSubscribe();
    
  };
};


useEffect(() => {

  handleSubscription(subscribe, unSubscribe);
  return () => {
    unSubscribe();
  };
}, [subscribe, unSubscribe]);


  useEffect(() => {
    subscribe(async (event) => {
      if (event.data.message === "EndGame scoreboard") {
        detach();
        const updatedUserData = {
          ...userData,
          scoreBoard: scoreBoard,
        };
      //  setCookie("userData", updatedUserData, { path: "/" });
        if (!userData.host && !isGameEnded.current) {
          isGameEnded.current = true;
          Alert.alert("Host has Ended the game");
        }
        navigation.navigate("FinalScore", {...updatedUserData });
      }
    });
  }, [scoreBoard]);


  return (
    <ScrollView contentContainerStyle={styles.container}>
     
     <View style={styles.closeButtonContainer}>
      <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.navigate("StartGame", {...userData })}
            >
              
              <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.scoreboardTitleContainer}>
        
    <TextInput style={styles.input} editable={false}>ScoreBoard!</TextInput>
    <Image
              source={require('../assets/polygon-downwards-white.png')}
              style={styles.downwardPolygonRight}
      />
       {/* <Polygon width={24} height={24} /> */}
      </View>
     
      <View style={styles.imageContainer}>
        {loadingImg ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Image
            source={{ uri: userData.imageURL }}
            style={styles.image}
          />
        )}
      </View>
  
      <Image
        source={require('../assets/polygon-upward-yellow.png')}
        style={styles.upwardPolygonLeft}
      />
      <View style={styles.scoreboardContainer}>
        <View style={styles.scoreboardHeader}>
          <Text style={styles.scoreText}>Alias</Text>
          <Text style={styles.scoreText}>Votes</Text>
          <Text style={styles.scoreText}>Points</Text>
          <Text style={styles.scoreText}>Total</Text>
        </View>
       
        {scoreBoard.map((player, index) => (
          <View key={index}>
            <View style={styles.scoreboardRow}>
              <Text style={styles.scoreText}>{player.user_alias}</Text>
              <Text style={styles.scoreText}>{player.votes}</Text>
              <Text style={styles.scoreText}>{player.score}</Text>
              <Text style={styles.scoreText}>{player.game_score}</Text>
            </View>
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>{player.caption !== "" ? player.caption : "\u00A0"}</Text>
            </View>
          </View>
        ))}
      </View>
      
      <View style={styles.buttonContainer}>
        {userData.host && userData.roundNumber !== userData.numOfRounds && (
           <TouchableOpacity style={styles.button} onPress={nextRoundButton}>
            <Text style={styles.buttonText}>Next Round</Text>
          </TouchableOpacity>
        )}
        <Image
          source={require('../assets/polygon-upward-white.png')}
          style={styles.upwardPolygonLeft}
          />
        <TextInput style={styles.input} editable={false}>{userData.deckTitle}</TextInput>
       
 
        {userData.host && userData.roundNumber === userData.numOfRounds && (
          <TouchableOpacity style={styles.button} onPress={finalScoresButton}>
            <Text style={styles.buttonText}>Final Score</Text>
          </TouchableOpacity>
        )}
      </View>
        
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    //justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E58D80',
    //paddingTop: 10,
    //paddingBottom: 10,
    marginTop: 30,
  },
  closeButtonContainer: {
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 10,
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
  scoreboardTitleContainer: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: -10,
    width: "80%",
  },


  imageContainer: {
    width: 340,
    height: 300,
    backgroundColor: '#D9D9D9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },

  scoreboardContainer: {
    maxWidth: '95%',
    padding: 20,
    borderRadius: 40,
    backgroundColor: '#F2BF7D',
    marginTop: 10,
  },
  scoreboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  scoreboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 350,
    height: 50,
  },
  captionContainer: {
    alignItems: 'center',
  },
  captionText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Grandstander",
  },
  buttonContainer: {
    width:300,
    alignItems: "center",

  },
  button: {
    width: '50%',
    height: 50,
    backgroundColor: '#46C3A6',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,

  },
  scoreText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Grandstander",
    
  },
  input: {
    width: '100%',
    height: 60,
    backgroundColor: 'white',
    borderRadius: 40,
    fontSize: 26,
    fontFamily: 'Grandstander',
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
    },
  buttonText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Grandstander",
    fontWeight: "700",
  },

  downwardPolygonRight: {
    marginTop: -10,
    width: 50, 
    height: 40, 
    right: -100,
    bottom: 10,
  },
  upwardPolygonLeft: {
    marginTop: -10,
    width: 50, 
    height: 50, 
    right: 90,
    bottom: -30,
  },
});



