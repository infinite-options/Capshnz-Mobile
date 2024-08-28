import React, { createContext,useState, useEffect, useRef, useContext } from "react";
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
import { useNavigation, useRoute,useFocusEffect } from "@react-navigation/native";
import useAbly from "../util/ably";
import {
  submitCaption,
  sendError,
  getScoreBoard,
  getSubmittedCaptions,
  getGameImageForRound,
} from "../util/Api";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
//import LoadingScreen from "./LoadingScreen";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ErrorContext = createContext();

const CaptionNew = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const { publish, subscribe, unSubscribe } = useAbly(userData.gameCode);
  const [caption, setCaption] = useState("");
  const [captionSubmitted, setCaptionSubmitted] = useState(false);
  const isCaptionDisplayed = useRef(false);
  const context = useContext(ErrorContext);
  const [inputCaption, setInputCaption] = useState("");
  const [isPageVisible, setPageVisibility] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(userData.roundTime || 60);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const [loadSpinner, setLoadSpinner] = useState(false);
  const captionInputRef = useRef(null);
  let isCaptionSubmitted = useRef(false);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const setItem = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  setItem('isOutofSync', false);
  
  const getItem = async (key) => {
      try {
        const value = await AsyncStorage.getItem(key);
        return value != null ? JSON.parse(value) : null;
      } catch (error) {
        console.error('Error getting item:', error);
      }
    };

  
  useEffect(() => {
    isCaptionSubmitted.current = captionSubmitted;
  }, [captionSubmitted]);

  useEffect(() => {
    setItem("minimize-time", 0)
    async function getCaptionsForUser() {
     
      const image_URL = await getGameImageForRound(
        userData.gameCode,
        userData.roundNumber
       );
      if (image_URL !== userData.imageURL) {
        await sendError("Caption Page", "userData.imageURL does not match cookies.userData.imageURL");
        const updatedUserData = {
          ...userData,
          imageURL: image_URL,
        };
        setUserData(updatedUserData);
      }
    }
    const interval = setInterval(() => {
      if (!isCaptionDisplayed.current){ //&& userData.imageURL !== userData.imageURL) {
        getCaptionsForUser();
        isCaptionDisplayed.current = true;
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      unSubscribe();
    };
  }, []);

  async function scoreBoard() {
    const scoreboard = await getScoreBoard(userData);
    scoreboard.sort((a, b) => b.game_score - a.game_score);
    return scoreboard;
  }

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
          message: "EndGame caption",
          scoreBoard: scoreboard,
        },
      });
    } catch (error) {
      handleApiError(error, closeButton, context);
    }
  }

  async function submitButton(timerComplete) {
    try {
      let numOfPlayersSubmitting = -1;
      if (caption === "" && !timerComplete) {
        alert("Please enter a valid caption.");
        return;
      }
      setCaptionSubmitted(true);
      if (caption !== "" && !timerComplete) {
        numOfPlayersSubmitting = await submitCaption(caption, userData);
      } else if (timerComplete) {
        numOfPlayersSubmitting = await submitCaption(caption, userData);
      }
      
      if(timerComplete || numOfPlayersSubmitting === 0){ //if timer runs out or everyone votes
        let publishTimer = 0;
        if(numOfPlayersSubmitting != 0)  publishTimer = 5000;
        function timeout() {

          setTimeout(async () => {
    
            await publish({
              data: {
                message: "Start Vote",
                roundNumber: userData.roundNumber,
                imageURL: userData.imageURL,
                // ,submittedCaptions: submittedCaptions,
              },
            });
          }, publishTimer); // 5000 milliseconds = 5 seconds
        }
        timeout();
      }
    } catch (error) {
      handleApiError(error, submitButton, context);
    }
    
  }

/*
  const handleCaptionChange = (text) => {
    setInputCaption(text);
    setCaption(text);  
  };
*/


  function handleChange(text) {
    setItem("user-caption", text);
    setCaption(text);
    setInputCaption(text);
  }



  useEffect(() => {


    subscribe((event) => {
      if (event.data.message === "Start Vote") {

        handleNavigate();
      }
      if (userData.host && event.data.message === "Start ScoreBoard") {
        navigation.reset({
          index: 0,
          routes: [{ name: "ScoreBoardNew", params: {...userData} }],
        });
       
      }
    });
  }, [userData]);

  const handleNavigate = async () => {
    if (isCaptionSubmitted.current && AppState.currentState === "active" && !userData.host) {
      navigation.navigate("MidGameWaitingRoom", {...userData });
    }
    let minimizeTime =  await AsyncStorage.getItem("minimize-time");
    let hostTime = false;
   
    let isDeSync = false;
    if (AppState.currentState === "active") {
      const diff = Math.ceil((new Date().getTime() - parseInt(await AsyncStorage.getItem("minimize-time"))) / 1000);
      if (diff < -4) {
        isCaptionSubmitted.current = true;
        setIsOutOfSync(true);
        isDeSync = true;
      }
    }


    if (!isDeSync) {
      const diff = Math.floor((new Date().getTime() - parseInt(await AsyncStorage.getItem ("minimize-time"))) / 1000);
    

      if (userData.host && (diff/1000000000 >= userData.roundTime)) {
        
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
       
        navigation.navigate("ScoreBoardNew", {...userData }); 

      } else if (!AppState.currentState === "active") {
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
      
        navigation.reset({
          index: 0,
          routes: [{ name: "VoteImage", params: {...userData} }],
        });
        
      }
      else{
       
        navigation.reset({
          index: 0,
          routes: [{ name: "VoteImage", params: {...userData} }],
        });
       
      }
    } else if (!userData.host) {
      setItem("isOutofSync", false);
      
      setTimeout(() => {
        navigation.navigate("MidGameWaitingRoom", {...userData });

      }, 2000);
    } else {
      
      const diff = Math.floor((new Date().getTime() - parseInt(await AsyncStorage.getItem("minimize-time"))) / 1000);
      if (diff >= (userData.roundTime + parseInt(await AsyncStorage.getItem("remaining-time")))) {
     
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
        hostTime = true
      }
      if( hostTime ){ 
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
        
       navigation.push("ScoreBoardNew", {...userData});

      } else {
       
        setTimeout(() => {
          setItem("minimize-time", 0);
          setItem("remaining-time", 0);
         
          navigation.navigate("VoteImage", {...userData});

        }, 2000);
      }
    }
  };

  useEffect(() => {
   
    const handleVisibilityChange = async (nextAppState) => {
    
      if (AppState.currentState === "active") {
       
        setTimeRemaining(timeRemaining);
        setItem("remaining-time", remainingTime);
        setItem("minimize-time", new Date().getTime());
      
        if (!captionSubmitted) {
          // Handle worker logic or alternative here
        }
        setPageVisibility(false);
      } else {
        
        const diff = Math.floor((new Date().getTime() - parseInt(await AsyncStorage.getItem("minimize-time"))) / 1000);
        
        setPageVisibility(true);
        if (timeRemaining - diff < 0 || captionSubmitted) {
          setTimeRemaining(0);
          handleNavigate();
        } else if (timeRemaining - diff >= 0) {
          setTimeRemaining(timeRemaining - diff);
        }
      }
      setAppState(nextAppState);
    };
   
    const subscription = AppState.addEventListener('change', handleVisibilityChange);
    
    // Clean up subscription on component unmount
    return () => {
      subscription.remove();
    };
  }, [appState, remainingTime]);

  return (
    <View style={styles.container}>
    {/*}  {getItem("isOutofSync") === "true" && <LoadingScreen />} */}
      <View style={styles.closeButtonContainer}>
      <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.navigate("StartGame", {...userData })}
            >
              
              <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
      </View>
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
          fontFamily="Arial"
          fontWeight="bold"
          onComplete={() => {
            submitButton(true);
          }}
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
      
      <View style={styles.buttonContainer}>
      {!captionSubmitted && (
      <TouchableOpacity
          style={[styles.button,captionSubmitted ? styles.buttonDisabled : null]}
          onPress={() => submitButton(false)}
          disabled={captionSubmitted}
        >
          <Text style={styles.buttonText}>
            {captionSubmitted ? "Submit" : "Submit"}
          </Text>
        </TouchableOpacity> 
       )}
    
       {captionSubmitted && (
        <TouchableOpacity
        style={[styles.button,captionSubmitted ? styles.buttonDisabled : null]}
        disabled={captionSubmitted}
        >
        
        <Text style={styles.buttonText}>
          Submitted
        </Text>
        </TouchableOpacity> 
        
        )}  
      </View>
      <View>  
      <View style={styles.spacing} />
        {captionSubmitted && (
        <TouchableOpacity
        style={styles.message}
        disabled={captionSubmitted}
        >
           <Text style={styles.message}>Waiting for other players to submit captions...</Text>
        </TouchableOpacity> 
        )} 
      </View>
      <View style={styles.centered}>
            <Image
                  source={require('../assets/polygon-upward-white.png')}
                  style={styles.upwardPolygonLeft}
              />
            <TextInput style={styles.input} editable={false}>{userData.deckTitle}</TextInput>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#7580B5D9',
    //'#D9D9D9', 
    //'#f8f9fa',
  },
  center: {
    alignItems: 'center'
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  roundText: {
    fontSize: 20,
    fontWeight: 'bold',
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
  captionContainer: {
    marginBottom: 20,
   // borderColor: 'red',
    borderWidth: 2,
    alignItems: 'center',
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
    borderWidth: 0,
    borderColor: 'white',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  

  button: {
    width: 200,
    height: 55,
    backgroundColor: "#5E9E94",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    
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
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    justifyContent: 'center',

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
  upwardPolygonLeft: {
    marginTop: -10,
    width: 50, 
    height: 50, 
    right: 100,
    bottom: -30,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 10, 
  },
  spacing: {
    height: 20, 
  },
  closeButtonContainer: {
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 10,
  },

});
export default CaptionNew;

