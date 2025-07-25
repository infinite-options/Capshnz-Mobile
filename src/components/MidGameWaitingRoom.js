import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useAbly from "../util/ably";

const MidGameWaitingRoom = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params || {});
  const { subscribe, unSubscribe } = useAbly(userData.gameCode);

  useEffect(() => {
    console.log("MidGameWaitingRoom component mounted");

    const handleEvent = (event) => {
      console.log("Event received:", event.data);

      if (AppState.currentState === "active") {
        console.log("AppState is active");

        const currentState = {
          ...userData,
          roundNumber: event.data.roundNumber,
          imageURL: event.data.imageURL,
          midGameTimeStamp: event.timestamp,
        };

        switch (event.data.message) {
          case "Start Vote":
            console.log("Navigating to VoteImage with state:", currentState);
            navigation.reset({
              index: 0,
              routes: [{ name: "VoteImage", params: {...currentState} }],
            });
            break;
          case "Start ScoreBoard":
            console.log("Navigating to ScoreBoardNew with state:", userData);
            navigation.reset({
              index: 0,
              routes: [{ name: "ScoreBoardNew", params: {...userData} }],
            });
            break;
          case "Start Next Round":
            console.log("Navigating to CaptionNew with state:", currentState);
            navigation.reset({
              index: 0,
              routes: [{ name: "CaptionNew", params: {...currentState} }],
            });
            break;
          case "Start EndGame":
            console.log("Navigating to FinalScore with state:", userData);
            navigation.reset({
              index: 0,
              routes: [{ name: "FinalScore", params: {...userData} }],
            });
            break;
          default:
            console.log("Unknown event message:", event.data.message);
            break;
        }
      } else {
        console.log("AppState is not active");
      }
    };

    console.log("Subscribing to Ably channel");
    subscribe(handleEvent);

    return () => {
      console.log("Unsubscribing from Ably channel");
      unSubscribe(handleEvent);
    };
  }, [subscribe, unSubscribe, userData, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={styles.text}>Wait while we add you back to the game</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E58D80',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: 'white',
  },
});

export default MidGameWaitingRoom;
