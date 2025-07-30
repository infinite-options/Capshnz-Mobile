import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  AppState,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import useAbly from "../util/ably";
import { ErrorContext } from "../../App";
import {
  submitCaption,
  sendError,
  getScoreBoard,
  getSubmittedCaptions,
  getGameImageForRound,
} from "../util/Api";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import LoadingScreen from "./LoadingScreen";
import AsyncStorage from '@react-native-async-storage/async-storage';

const CaptionNew = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const { publish, subscribe, unSubscribe } = useAbly(userData.gameCode);
  const [caption, setCaption] = useState("");
  const [captionSubmitted, setCaptionSubmitted] = useState(false);
  const context = useContext(ErrorContext);
  const [inputCaption, setInputCaption] = useState("");
  const [isPageVisible, setPageVisibility] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(userData.roundTime || 60);
  const [loadSpinner, setLoadSpinner] = useState(false);

  const captionInputRef = useRef(null);
  const isCaptionSubmitted = useRef(false);

  const setItem = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item:', error);
    }
  };

  function handleChange(text) {
    setItem("user-caption", text);
    setCaption(text);
    setInputCaption(text);
    console.log('Caption updated:', text);
  }

  async function submitButton(timerComplete) {
    try {
      if (caption === "" && !timerComplete) {
        alert("Please enter a valid caption.");
        return;
      }

      setCaptionSubmitted(true);

      const result = await submitCaption(caption, userData);

      if (timerComplete || result === 0) {
        setTimeout(async () => {
          await publish({
            data: {
              message: "Start Vote",
              roundNumber: userData.roundNumber,
              imageURL: userData.imageURL,
            },
          });
        }, result === 0 ? 0 : 5000);
      }
    } catch (error) {
      console.error("Error submitting caption:", error);
    }
  }

  useEffect(() => {
    subscribe((event) => {
      if (event.data.message === "Start Vote") {
        navigation.navigate("VoteImage", { ...userData });
      }
    });

    return () => {
      unSubscribe(); // ✅ correct cleanup
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: userData.imageURL }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <View style={styles.timerContainer}>
        <CountdownCircleTimer
          size={76}
          strokeWidth={5}
          isPlaying={isPageVisible}
          duration={timeRemaining}
          colors="#000000"
          background="#566176"
          onComplete={() => submitButton(true)}
        >
          {({ remainingTime }) => {
            setItem("remaining-time", remainingTime);
            return <Text>{remainingTime}</Text>;
          }}
        </CountdownCircleTimer>
      </View>

      <TextInput
        style={styles.captionInput}
        value={inputCaption}
        onChangeText={handleChange}
        ref={captionInputRef}
        placeholder="Enter your caption here"
      />

      {loadSpinner && (
        <ActivityIndicator size="large" color="#0000ff" />
      )}

      {/* 🟣 Centered Submit Button */}
      <View style={styles.submitButtonWrapper}>
        <TouchableOpacity
          style={[styles.button, captionSubmitted ? styles.buttonDisabled : null]}
          onPress={() => submitButton(false)}
          disabled={captionSubmitted}
        >
          <Text style={styles.buttonText}>
            {captionSubmitted ? "Submit" : "Submit"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centered}>
        <Image
          source={require('../assets/polygon-upward-white.png')}
          style={styles.upwardPolygonLeft}
        />
        <Text style={styles.input}>{userData.deckTitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#7580B5D9',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  timerContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  captionInput: {
    width: '90%',
    height: 55,
    backgroundColor: 'white',
    borderRadius: 40,
    color: 'black',
    fontSize: 26,
    fontFamily: 'Grandstander',
    fontWeight: '500',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  // ✅ NEW WRAPPER TO CENTER BUTTON
  submitButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },

  button: {
    width: 200,
    height: 55,
    backgroundColor: "#5E9E94",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 24,
    fontFamily: "Grandstander",
    fontWeight: "700",
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
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
  },
  upwardPolygonLeft: {
    marginTop: -10,
    width: 50,
    height: 50,
    right: 100,
    bottom: -30,
  },
});

export default CaptionNew;
