import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import useAbly from "../util/ably";
import { getScoreBoard, getNextImage, getGameScore } from "../util/Api";
import { handleApiError } from "../util/ApiHelper";
import { ErrorContext } from "../../App";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ScoreBoardNew() {
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

  useEffect(() => {
    if (!isScoreBoard && userData.host && userData.scoreBoard === undefined) {
      async function setScoreBoard() {
        const scoreBoard = await getScoreBoard(userData);
        setLoadingImg(false);
        scoreBoard.sort((a, b) => b.votes - a.votes);
        setIsScoreBoard(true);
        publish({ data: { message: "Set ScoreBoard", scoreBoard } });
      }
      setScoreBoard();
    }
  }, [userData, isScoreBoard]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isScoreBoardDisplayed.current && scoreBoard.length === 0) {
        async function loadGameScore() {
          const scoreboard = await getGameScore(userData.gameCode, userData.roundNumber);
          setLoadingImg(false);
          scoreboard.sort((a, b) => b.game_score - a.game_score);
          setScoreBoard(scoreboard);
        }
        loadGameScore();
        isScoreBoardDisplayed.current = true;
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scoreBoard]);

  useEffect(() => {
    subscribe((event) => {
      if (event.data.message === "Set ScoreBoard") {
        setLoadingImg(false);
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
          routes: [{ name: "CaptionNew", params: { ...updatedUserData } }],
        });
      } else if (event.data.message === "Start EndGame") {
        navigation.navigate("FinalScore", { ...userData });
      }
    });

    return () => {
      unSubscribe();
    };
  }, [subscribe, unSubscribe]);

  useEffect(() => {
    subscribe((event) => {
      if (event.data.message === "EndGame scoreboard") {
        detach();
        if (!userData.host && !isGameEnded.current) {
          isGameEnded.current = true;
          Alert.alert("Host has Ended the game");
        }
        navigation.navigate("FinalScore", { ...userData });
      }
    });
  }, [scoreBoard]);

  async function nextRoundButton() {
    try {
      const nextRound = userData.roundNumber + 1;
      const imageURL = await getNextImage(userData.gameCode, nextRound);
      await publish({
        data: {
          message: "Start Next Round",
          roundNumber: nextRound,
          imageURL,
        },
      });
    } catch (error) {
      handleApiError(error, nextRoundButton, context);
    }
  }

  async function finalScoresButton() {
    await publish({ data: { message: "Start EndGame" } });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.scoreboardTitleContainer}>
  <Text style={styles.titleText}>ScoreBoard!</Text>
  <View style={styles.triangleDown} />
</View>

      

      <View style={styles.imageContainer}>
        {loadingImg ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Image source={{ uri: userData.imageURL }} style={styles.image} />
        )}
      </View>

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
              <Text style={styles.captionText}>
                {player.caption !== "" ? player.caption : "\u00A0"}
              </Text>
            </View>
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>
                {player.caption !== "" ? "\u00A0" : "\u00A0"}
              </Text>
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
        <Text style={styles.input}>{userData.deckTitle}</Text>
        {userData.host && userData.roundNumber === userData.numOfRounds && (
          <TouchableOpacity style={styles.button} onPress={finalScoresButton}>
            <Text style={styles.buttonText}>Final Score</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#E58D80",
  },
  scoreboardTitleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 16,
  },
  titleText: {
    fontSize: 30,
    fontWeight: "normal",
    textAlign: "center",
    alignSelf: "center",
    color: "#000",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    overflow: "visible",
    maxWidth: "100%",
    minWidth: 200,
    overflow: 'hidden',
  },
  downwardPolygon: {
  width: 40,
  height: 20,
  marginTop: 10,
  marginLeft: 145, // Adjust this value until the polygon is under the "r"
  alignSelf: "flex-start",
},
  imageContainer: {
    width: 340,
    height: 300,
    backgroundColor: "#D9D9D9",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  scoreboardContainer: {
    maxWidth: "95%",
    padding: 20,
    borderRadius: 40,
    backgroundColor: "#F2BF7D",
    marginTop: 10,
  },
  scoreboardHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    
  },
  scoreboardRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: 350,
    height: 35,
  },
  captionContainer: {
  alignItems: "center",
  marginTop: 0, // Increased space between points row and caption
},
  captionText: {
  color: "#2D3748", // Darker color for contrast
  fontSize: 26,
  fontFamily: "Arial",
  fontWeight: "bold",
  fontStyle: "italic",
  //backgroundColor: "#FFF9C4", // Light yellow highlight (optional)
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
  textAlign: "center",
},
  scoreText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Arial",
  },
  input: {
  width: 250,
  height: 50, // Match the height to the container
  backgroundColor: "white",
  borderRadius: 25,
  fontSize: 22,
  fontFamily: "Arial",
  fontWeight: "normal",
  textAlign: "center",
  textAlignVertical: "center", // Helps on Android
  marginVertical: 10,
  paddingHorizontal: 0,
  paddingVertical: 0,
  alignSelf: "center",
  justifyContent: "center", // Not needed for Text, but fine if used in View
  lineHeight: 50, // Ensures vertical centering for the text
  overflow: "hidden",
},
  inputText: {
    fontSize: 26,
    fontFamily: "Arial",
    fontWeight: "normal",
    textAlign: "center",      // center text inside Text
    color: "black",
  },
  buttonGallery: {
  width: 250,
  height: 50,
  backgroundColor: "white",
  borderRadius: 25,
  justifyContent: "center",
  alignItems: "center",
  alignSelf: "center",
  marginVertical: 10,
},
buttonGalleryText: {
  fontSize: 22,
  fontFamily: "Arial",
  fontWeight: "normal",
  color: "black",
  textAlign: "center",
},
  //
  buttonContainer: {
    width: 300,
    alignItems: "center",
  },
  button: {
    width: "50%",
    height: 50,
    backgroundColor: "#46C3A6",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  scoreboardTitleContainer: {
  alignItems: "center",
  justifyContent: "center",
  marginTop: 20,
  paddingHorizontal: 16,
},
downwardPolygon: {
    width: 40,
    height: 20,
    marginTop: 0, // Set to 0 to remove the gap
    marginLeft: 145, // Adjust as needed for horizontal alignment
    alignSelf: "flex-start",
  },
titleText: {
    fontSize: 30,
    fontWeight: "normal",
    textAlign: "center",
    alignSelf: "center",
    color: "#000",
    backgroundColor: "#fff",
    paddingVertical: 6, // Reduced from 10 to 6 (or try 4)
    paddingHorizontal: 24,
    borderRadius: 24,
    maxWidth: "100%",
    minWidth: 200,
    overflow: "hidden",
  },
  buttonText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: "normal",
  },
  triangleDown: {
  width: 0,
  height: 0,
  borderLeftWidth: 20,
  borderRightWidth: 20,
  borderTopWidth: 16,
  borderLeftColor: 'transparent',
  borderRightColor: 'transparent',
  borderTopColor: '#fff', // Match your banner background
  alignSelf: 'center',
  marginTop: -2,
  marginBottom: 12,
  marginLeft: 120, // Increase this value to shift right
},
});


