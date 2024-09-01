import React, { createContext,useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useNavigation, useRoute,useFocusEffect} from "@react-navigation/native";
import useAbly from "../util/ably";
import { createGame, joinGame } from "../util/Api.js";
import { handleApiError } from "../util/ApiHelper.js";

export const ErrorContext = createContext();

export default function ChooseRounds() {
    


    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params);
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


    useFocusEffect(
      React.useCallback(() => {
          navigation.setOptions({ headerShown: false });
      }, [navigation])
    );
    
    

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
        if (!validateRoundInfo()) return;
        
        const gameInfo = await createGame(
            userData.playerUID,
            roundInfo.numOfRounds,
            roundInfo.roundTime,
            userData.scoreType
        );


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

      
        await joinGame(updatedUserData);

       
        navigation.reset({
          index: 0,
         // routes: [{ name: "WaitingRoom", params: {...updatedUserData} }],
         routes: [{ name: "ChooseroundToWaitingRoom", params: {...updatedUserData} }],
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
              onPress={() => navigation.navigate("StartGame", {...userData })}
            >
              
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>
            <Text style={styles.header}></Text>
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
        alignItems: "center",
        backgroundColor: "rgba(153, 90, 98, 0.70)",
        paddingBottom: 10,
        paddingTop: 20,
        width: "100%",

      },
      innerContainer: {
        flex: 1, 
        padding: 20,
        justifyContent: 'space-between',
        width: "100%",
        alignItems: "center",
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
    