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
  //const userData = route.params;
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
    //console.log("inside  use effect captions for User");
    console.log('Caption -- Round# line 71',userData.roundNumber);
    console.log('Caption --Game Code line 72',userData.gameCode);
    async function getCaptionsForUser() {
     // console.log("Use Effect----getCaptions");
     
      const image_URL = await getGameImageForRound(
        userData.gameCode,
        userData.roundNumber
       );
       //console.log(userData.gameCode);
       //console.log(userData.roundNumber);
      //console.log("line 80 ",image_URL);
      if (image_URL !== userData.imageURL) {
        await sendError("Caption Page", "userData.imageURL does not match cookies.userData.imageURL");
        const updatedUserData = {
          ...userData,
          imageURL: image_URL,
        };
        setUserData(updatedUserData);
      }
    }
    console.log('Caption Imag Url line 92',userData.imageURL);
   // console.log(isCaptionDisplayed.current);
    const interval = setInterval(() => {
      if (!isCaptionDisplayed.current){ //&& userData.imageURL !== userData.imageURL) {
       // console.log("inside If----");
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

  /*
  function handleChange(event) {

    console.log('Key pressed:', event.nativeEvent.key);
    console.log('Current caption:', inputCaption);

    setItem("user-caption", event.target.value);
    setCaption(event.target.value);
    setInputCaption(event.target.value);
  }
  */

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
    console.log("submitButton function")
    try {
      let numOfPlayersSubmitting = -1;
      if (caption === "" && !timerComplete) {
        alert("Please enter a valid caption.");
        return;
      }
      setCaptionSubmitted(true);
      if (caption !== "" && !timerComplete) {
         console.log("Caption New line 157");
        numOfPlayersSubmitting = await submitCaption(caption, userData);
      } else if (timerComplete) {
        console.log("Caption New line 160");
        numOfPlayersSubmitting = await submitCaption(caption, userData);
      }
      console.log("Caption New line 163");
      console.log('numOfPlayersSubmitting',numOfPlayersSubmitting);
      console.log('timerComplete',timerComplete);
      
      if(timerComplete || numOfPlayersSubmitting === 0){ //if timer runs out or everyone votes
        let publishTimer = 0;
        console.log("Caption New line 169");
        if(numOfPlayersSubmitting != 0)  publishTimer = 5000;
        console.log("Caption New line 171");
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
    console.log('Caption updated:', text);
  }



  useEffect(() => {
   // console.log("use efferct - subscribe");


    subscribe((event) => {
      if (event.data.message === "Start Vote") {
        console.log("getting called from subscribe 294, time --->", new Date().getTime(), captionSubmitted)

        handleNavigate();
      }
      if (userData.host && event.data.message === "Start ScoreBoard") {
        console.log('before submit to ScoreBoard 1 ',userData);
       // navigation.navigate("ScoreBoardNew", {...userData});
        navigation.reset({
          index: 0,
          routes: [{ name: "ScoreBoardNew", params: {...userData} }],
        });
       
      }
    });
  }, [userData]);

  const handleNavigate = async () => {
    console.log("here in navigate, captionSubmitted, appState, time remaining", isCaptionSubmitted.current, appState);
//console.log(AppState.currentState)
    if (isCaptionSubmitted.current && AppState.currentState === "active" && !userData.host) {
      console.log(" Before MidGame - If");
      navigation.navigate("MidGameWaitingRoom", {...userData });
      /*
      navigation.navigate({
        name: "MidGameWaitingRoom",
        params: {...userData },
        key: "MidGameWaitingRoom-${Date.now()}", // Use a unique key
      });*/
    }
    let minimizeTime =  await AsyncStorage.getItem("minimize-time");
    let hostTime = false;
  //  console.log("minimize time, remTime", minimizeTime, await AsyncStorage.getItem("remaining-time"))
   
    let isDeSync = false;
    if (AppState.currentState === "active") {
      const diff = Math.ceil((new Date().getTime() - parseInt(await AsyncStorage.getItem("minimize-time"))) / 1000);
      if (diff < -4) {
        isCaptionSubmitted.current = true;
        setIsOutOfSync(true);
        isDeSync = true;
      }
    }

    console.log("Caption New isDeSync :", isDeSync);


    if (!isDeSync) {
      console.log("H2")
      console.log("Min time",getItem ("minimize-time"))
      console.log("A: ", new Date().getTime())
      console.log("B: ",AsyncStorage.getItem ("minimize-time"))
      console.log("C: ", ((new Date().getTime() - parseInt(await AsyncStorage.getItem ("minimize-time"))) / 1000))
      const diff = Math.floor((new Date().getTime() - parseInt(await AsyncStorage.getItem ("minimize-time"))) / 1000);
      //console.log("diff: ", diff/1000000000)
      console.log("diff: ", diff);
      console.log('userData.roundTime',userData.roundTime);
      console.log("current state: ", AppState.currentState)

      if (userData.host && (diff/1000000000 >= userData.roundTime)) {
     // if (userData.host && (diff >= userData.roundTime)) {
        console.log("userdata host: ",userData.host)
        console.log("userdata roundTime: ",userData.roundTime)

        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
        console.log('before submit to ScoreBoard 2',userData);
        navigation.navigate("ScoreBoardNew", {...userData }); 
        /*
        navigation.navigate({
          name: "ScoreboardNew",
          params: {...userData},
          key: "ScoreboardNew-${Date.now()}", // Use a unique key
        });*/
      } else if (!AppState.currentState === "active") {
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
        console.log("On CaptionNew 1 going to VoteImage")
       // navigation.push("VoteImage", {...userData });
       console.log(navigation.getState());
        navigation.reset({
          index: 0,
          routes: [{ name: "VoteImage", params: {...userData} }],
        });
        console.log(navigation.getState());
      }
      else{
        console.log("On CaptionNew 1a going to VoteImage - line 300")
       // navigation.push("VoteImage", {...userData });
       console.log('navigation.getState',navigation.getState());
        navigation.reset({
          index: 0,
          routes: [{ name: "VoteImage", params: {...userData} }],
        });
        console.log(navigation.getState());
      }
    } else if (!userData.host) {
      setItem("isOutofSync", false);
     // removeItem("user-caption")
      console.log("H3")
      setTimeout(() => {
        navigation.navigate("MidGameWaitingRoom", {...userData });
        /*navigation.navigate({
          name: "MidGameWaitingRoom",
          params: {...userData},
          key: "MidGameWaitingRoom-${Date.now()}", // Use a unique key
        });*/
      }, 2000);
    } else {
      console.log("H4")
      const diff = Math.floor((new Date().getTime() - parseInt(await AsyncStorage.getItem("minimize-time"))) / 1000);
      if (diff >= (userData.roundTime + parseInt(await AsyncStorage.getItem("remaining-time")))) {
     //   console.log("H5")
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
        hostTime = true
      }
      if( hostTime ){ 
        setItem("minimize-time", 0);
        setItem("remaining-time", 0);
        console.log('before submit to ScoreBoard 3',userData);
       navigation.push("ScoreBoardNew", {...userData});
       /*
       navigation.navigate({
        name: "ScoreboardNew",
        params: {...userData},
        key: "ScoreboardNew-${Date.now()}", // Use a unique key
      });*/
      } else {
        console.log("H6");
        setTimeout(() => {
          setItem("minimize-time", 0);
          setItem("remaining-time", 0);
          console.log("On CaptionNew 2 going to VoteImage")
          navigation.navigate("VoteImage", {...userData});
         /*
          navigation.navigate({
          name: "VoteImage",
          params: {...userData},
          key: "VoteImage-${Date.now()}", // Use a unique key
        });*/
        }, 2000);
      }
    }
  };

  useEffect(() => {
    //console.log("HVC0")
    const handleVisibilityChange = async (nextAppState) => {
    //  console.log("HVC1",nextAppState)
      if (AppState.currentState === "active") {
       // console.log("HVC2")
        setTimeRemaining(timeRemaining);
        setItem("remaining-time", remainingTime);
        setItem("minimize-time", new Date().getTime());
      //  console.log("minimize: ", await AsyncStorage.getItem("minimize-time"));
        if (!captionSubmitted) {
          // Handle worker logic or alternative here
        }
        setPageVisibility(false);
      } else {
        //console.log("HVC3")
        const diff = Math.floor((new Date().getTime() - parseInt(await AsyncStorage.getItem("minimize-time"))) / 1000);
        //console.log("diff in handleVisibility: ", diff)
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
    //console.log("HVC0--before listener")
    const subscription = AppState.addEventListener('change', handleVisibilityChange);
    //console.log("HVC0--after listener")
    // Clean up subscription on component unmount
    return () => {
      subscription.remove();
    };
  }, [appState, remainingTime]);

  return (
    <View style={styles.container}>
    {/*}  {getItem("isOutofSync") === "true" && <LoadingScreen />} */}
      <View style={styles.closeButtonContainer}>
        <TouchableOpacity onPress={() => navigation.navigate("StartGame", { state: userData })}>
          <Text></Text>
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
     
      <TouchableOpacity
          style={[styles.button,captionSubmitted ? styles.buttonDisabled : null]}
          onPress={() => submitButton(false)}
          disabled={captionSubmitted}
        >
          <Text style={styles.buttonText}>
            {captionSubmitted ? "Submit" : "Submit"}
          </Text>
        </TouchableOpacity> 

{/*
        {captionSubmitted(
        <TouchableOpacity
        style={[styles.button,captionSubmitted ? styles.buttonDisabled : null]}
        disabled={captionSubmitted}
      >
        <Text style={styles.buttonText}>
          Submitted
        </Text>
        </TouchableOpacity> )} */}
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
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
   // justifyContent: "space-around",
    width: "80%",
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
 //   borderWidth: 1,
 //   borderColor: '#ccc',
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
});
export default CaptionNew;

