import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
//import { useCookies } from "react-cookie";
import useAbly from "../util/ably";
import { createGame, joinGame } from "../util/Api.js";
import { ErrorContext } from "../../App";
import { handleApiError } from "../util/ApiHelper.js";

export default function ChooseRounds() {
    

    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params);
    //const [cookies, setCookie] = useCookies(["userData"]);
    const [roundInfo, setRoundInfo] = useState({
      numOfRounds: 10,
      roundTime: 60,
    });
    const [isLoading, setLoading] = useState(false);
    const context = useContext(ErrorContext);
    const { publish } = useAbly(userData.gameCode);
  
    const handleChange = (name, value) => {
      setRoundInfo({
        ...roundInfo,
        [name]: parseInt(value),
      });
    };


    console.log("Choose Round ",userData);

    const validateRoundInfo = () => {
      if (
        !Number.isFinite(roundInfo.numOfRounds) ||
        roundInfo.numOfRounds < 1 ||
        roundInfo.numOfRounds > 20
      ) {
        Alert.alert("Please enter 1 - 20 rounds.");
        return false;
      } else if (
        !Number.isFinite(roundInfo.roundTime) ||
        roundInfo.roundTime < 1 ||
        roundInfo.roundTime > 120
      ) {
        Alert.alert("Please enter a value less than 120 seconds.");
        return false;
      }
      return true;
    };
  
    const continueButton = async () => {
      try {
        setLoading(true);
       // console.log("Choose round- line 52");
        if (!validateRoundInfo()) return;
 ;
        const gameInfo = await createGame(
            userData.playerUID,
            roundInfo.numOfRounds,
            roundInfo.roundTime,
            userData.scoreType
        );


      //  console.log("Choose round- line 61");
        if (userData.playAgain) {
          await publish({
            data: {
              message: "Start Again",
              gameCode: gameInfo.game_code,
            },
          });
        }
        const updatedUserData = {
          ...userData,
          deckSelected: false,
          numOfRounds: roundInfo.numOfRounds,
          roundTime: roundInfo.roundTime,
          gameUID: gameInfo.game_uid,
          gameCode: gameInfo.game_code,
        };
        setUserData(updatedUserData);

      
     //   setCookie("userData", updatedUserData, { path: "/" });
        await joinGame(updatedUserData);

        console.log("Choose round to WaitingRoom");
        navigation.reset({
          index: 0,
          routes: [{ name: "WaitingRoom", params: {...updatedUserData} }],
        });

      } catch (error) {
        handleApiError(error, continueButton, context);
      } finally {
        setLoading(false);
      }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.innerContainer}>
            <View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.navigate("StartGame", { userData })}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.header}>Number of Rounds</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter # of rounds here..."
              keyboardType="numeric"
              onChangeText={(value) => handleChange("numOfRounds", value)}
            />
            <Text style={styles.subText}>1 image per round</Text>
            </View>

            <View>
            <Text style={styles.header}>Round Time</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter # of seconds here..."
              keyboardType="numeric"
              onChangeText={(value) => handleChange("roundTime", value)}
            />
            <Text style={styles.subText}>We recommend 60</Text>
      
            <TouchableOpacity
              style={styles.continueButton}
              onPress={continueButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.continueButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      );
    };
    
    const styles = StyleSheet.create({
      container: {
        flexGrow: 1,
     //   justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(153, 90, 98, 0.70)",
        paddingBottom: "1rem",
        paddingTop: "2rem",
        borderWidth: 2,
        borderColor: "black",
      },
      innerContainer: {
        flex: 1, 
        padding: 20,
        justifyContent: 'space-between',
      },
      closeButton: {
        position: "absolute",
        right: 5,
        top: 5,
        zIndex: 10,
      },
      closeButtonText: {
        fontSize: 24,
        color: "black",
      },
      header: {
        color: "white",
        fontSize: 32,
        fontFamily: "Grandstander",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 20,
      },
      input: {
        width: 330,
        height: 50,
        backgroundColor: "white",
        borderRadius: 40,
        color: "black",
        fontSize: 23,
        fontFamily: "Grandstander",
        fontWeight: "500",
        textAlign: "center",
        marginBottom: 10,
      },
      subText: {
        color: "white",
        fontSize: 24,
        fontFamily: "Grandstander",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: 20,
      },
      continueButton: {
        width: 330,
        height: 50,
        backgroundColor: "#5E9E94",
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 40,
      },
      continueButtonText: {
        color: "white",
        fontSize: 40,
        fontFamily: "Grandstander",
        fontWeight: "600",
      },
    });
    