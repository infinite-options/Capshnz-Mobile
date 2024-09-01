import React, { createContext,useState, useContext, useEffect } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput } from "react-native";
import { useNavigation, useRoute,useFocusEffect } from "@react-navigation/native";
import { handleApiError } from "../util/ApiHelper";
import { joinGame, getGameScore, summary, summaryEmail } from "../util/Api";
import useAbly from "../util/ably";
import axios from "axios";
export const ErrorContext = createContext();

const FinalScore = () => {
  
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const [scoreBoard, setScoreBoard] = useState([]);
  const [captions, setCaptions] = useState([]);
  const [loadingImg, setLoadingImg] = useState(false);
  const { publish, subscribe, unSubscribe } = useAbly(userData.gameCode);
  const [isLoading, setLoading] = useState(false);
  const [isSending, setSending] = useState(false);
  const [isHostStartingAgain, setHostStartingAgain] = useState(false);
  const context = useContext(ErrorContext);

  async function startGameButton() {
    try {
      setLoading(true);
      const updatedUserData = {
        ...userData,
        roundNumber: 1,
        playAgain: true,
      };
      setUserData(updatedUserData);
      await publish({ data: { message: "Play Again" } });
     // navigation.navigate("ChooseScoring", {state: updatedUserData});
      navigation.reset({
        index: 0,
        routes: [{ name: "ChooseScoring", params: {userData: updatedUserData} }],
      });
      
    } catch (error) {
      if (axios.isTimeoutError(error)) {
        alert(
          "The operation time of Play Again is too long, please try again!"
        );
      } else {
        handleApiError(error, startGameButton, context);
      }
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  const subscribePlayAgain = async () => {
    await subscribe(async (event) => {
      if (event.data.message === "Play Again") {
        setHostStartingAgain(true);
      } else if (event.data.message === "Start Again") {
        const updatedUserData = {
          ...userData,
          gameCode: event.data.gameCode,
          roundNumber: 1,
          host: false,
        };
        await joinGame(updatedUserData);
      //  navigation.navigate("WaitingRoom", {...updatedUserData});
        navigation.reset({
          index: 0,
          routes: [{ name: "WaitingRoom", params: {...updatedUserData} }],
        });
      }
    });
  };

  const fetchSummary = async () => {
    const response = await summary(userData.gameUID);
    setCaptions(response.data.captions);
  };

  const sendEmail = async () => {
    try {
      setSending(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      summaryEmail(userData);
    } catch (error) {
      handleApiError(error, sendEmail, context);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    subscribePlayAgain();
    fetchSummary();
    return () => unSubscribe();
  }, []);

  useEffect(() => {
    async function scoreBoard() {
      setLoadingImg(true);
      const scoreboard = await getGameScore(
        userData.gameCode,
        userData.numOfRounds
      );
      setLoadingImg(false);
      scoreboard.sort((a, b) => b.game_score - a.game_score);
      setScoreBoard(scoreboard);
    }
    scoreBoard();
  }, [userData]);

  function landingButton() {
    navigation.navigate("StartGame", {...userData});
  }

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

        <TextInput style={styles.input} editable={false}>
          GameOver!
        </TextInput>
        <Image
          source={require('../assets/polygon-downwards-white.png')}
          style={styles.downwardPolygonRight}
      />
      </View>

      <View style={styles.scoreboardTitleContainer}>
        <TextInput style={styles.input} editable={false}>
          FinalScore!
        </TextInput>
        <Image
          source={require('../assets/polygon-downwards-white.png')}
          style={styles.downwardPolygonRight}
      />
      </View>

      {loadingImg && <ActivityIndicator size="large" color="#0000ff" />}

      <View style={styles.scoreboardContainer}>
        <View style={styles.scoreboardHeader}>
          <Text style={styles.headerText}>Alias</Text>
          <Text style={styles.headerText}>Total</Text>
        </View>
        {scoreBoard.map((player, index) => (
          <View key={index} style={styles.scoreboardRow}>
            <Text style={styles.rowText}>{player.user_alias}</Text>
            <Text style={styles.rowText}>{player.game_score}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        {userData.host && (
          <TouchableOpacity
            style={styles.button}
            onPress={startGameButton}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Starting..." : "Play again"}
            </Text>
          </TouchableOpacity>
        )}
        {isHostStartingAgain && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0000ff" />
            <Text>Starting again...</Text>
          </View>
        )}
        <TouchableOpacity style={styles.button} onPress={landingButton}>
          <Text style={styles.buttonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreboardTitleContainer}>
 
        <TextInput style={styles.input} editable={false}>
          Winning Captions
        </TextInput>
        <Image
          source={require('../assets/polygon-downwards-white.png')}
          style={styles.downwardPolygonRight}
        />

      </View>

      {captions.map((caption, index) => (
        <View key={index} style={styles.captionContainer}>
          {caption.round_image_uid && (
            <Image
              source={{ uri: caption.round_image_uid }}
              style={styles.image}
            />
          )}
          {caption.round_number && (
            <Text style={styles.captionText}>
              Round: {caption.round_number}
            </Text>
          )}
          <View style={styles.captionButtonContainer}>
            <TouchableOpacity style={styles.captionButton}>
              <Text style={styles.captionButtonText}>{caption.caption}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))} 
      {userData.host && (
        <TouchableOpacity
          style={styles.button}
          onPress={sendEmail}
          disabled={isSending}
        >
          <Text style={styles.buttonText}>
            {isSending ? "Sending..." : "Send Email"}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#E58D80",
    paddingTop: 20,
    paddingBottom: 10,
    marginTop: 20,
   

  },
  input: {
    width: "70%",
    height: 60,
    backgroundColor: "white",
    borderRadius: 30,
    fontSize: 26,
    fontFamily: "Grandstander",
    fontWeight: "400",
    textAlign: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  scoreboardTitleContainer: {
    alignItems: "center",
    width: "100%",
    marginTop: 10,
    marginBottom: -10,

  },
  scoreboardContainer: {
    width: "90%",
    borderRadius: 40,
    backgroundColor: "#46C3A6",
    marginTop: 10,
    paddingVertical: 20,
  },
  scoreboardHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    color: "#FFF",
  },
  scoreboardRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  rowText: {
    fontSize: 18,
    color: "#FFF",
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",

  },
  button: {
    width: 350,
    height: 55,
    backgroundColor: "#5E9E94",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "white",
    fontSize: 30,
    fontFamily: "Grandstander",
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  captionContainer: {
    marginTop: 40,
    alignItems: "center",

  },
  image: {
    width: 300,
    height: 200,
    resizeMode: "contain",
    borderRadius: 10,
  },
  captionText: {
    fontSize: 20,
    color: "#FFF",
    fontFamily: "Grandstander",
    marginTop: 10,
  },
  captionButtonContainer: {
    marginTop: 10,
    borderRadius: 30,
    width: 200,
  },
  captionButton: {
    backgroundColor: "white",
    borderRadius: 30,
    padding: 10,
    alignItems: "center",
  },
  captionButtonText: {
    color: "black",
    fontSize: 18,
    
  },
  downwardPolygonRight: {
    marginTop: -10,
    width: 50, 
    height: 40, 
    right: -80,
    bottom: 10,
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

export default FinalScore;
