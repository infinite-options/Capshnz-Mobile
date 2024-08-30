import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert,Image, ScrollView } from "react-native";
import { useNavigation, useRoute,useFocusEffect } from "@react-navigation/native";
//import { ErrorContext } from '../../App'; 
import { handleApiError } from "../util/ApiHelper";
import { addUser, checkGameCode, joinGame } from "../util/Api";

export default function ChooseScoring() {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params.userData);
  const [scoreType, setScoreType] = useState("");
  const [isVoteClicked, setIsVoteClicked] = useState(false);
  const [isRankClicked, setIsRankClicked] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  function continueButton() {
    if (scoreType === "") {
      Alert.alert("Please select a scoring system.");
      return;
    }
    const updatedUserData = {
      ...userData,
      scoreType: scoreType,
    };
    setUserData(updatedUserData);
   

   navigation.navigate("ChooseRounds", {...updatedUserData });

  }

  const handleClick = (scoretype) => {
  if (scoretype=="R") {
    setIsRankClicked(true); 
    setIsVoteClicked(false);
  }
  else {
    setIsVoteClicked(true); 
    setIsRankClicked(false); 
  }
    setScoreType(scoretype);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.innerContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate("StartGame", {...userData })}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
        <Text style={styles.header}></Text>
        <Text style={styles.header}>Choose a scoring system</Text>
        <TouchableOpacity
          style={[styles.button, isVoteClicked && styles.buttonClicked]} 
          onPress={() => handleClick("V")}
        >
          <Text style={styles.buttonText}>Score by Votes</Text>
        </TouchableOpacity>
        <Image
          source={require('../assets/Polygon 4.png')}
          style={styles.downwardPolygonRight}
        />

        <Text style={styles.description}>player receives 2 points per vote</Text>
        <Text style={styles.scoreText}>OR</Text>
        <TouchableOpacity
          style={[styles.button, isRankClicked && styles.buttonClicked]} 
          onPress={() => handleClick("R")}
        >
          <Text style={styles.buttonText}>Score by Ranking</Text>
        </TouchableOpacity>
        <Image
          source={require('../assets/Polygon 4.png')}
          style={styles.downwardPolygonRight}
        />
        <Text style={styles.description}>
          player(or players) with the most votes = 5 points, 2nd place gets 3 points
        </Text>
        <TouchableOpacity style={styles.continueButton} onPress={continueButton}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(183, 214, 225, 1)",
      paddingBottom: 20,
      paddingTop: 20,
    },
    innerContainer: {
      width: '100%',
      maxWidth: 440,
      alignItems: "center",
      paddingHorizontal: 20,
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
      fontSize: 30,
      fontFamily: "Grandstander",
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 32,
    },
    button: {
      width: 330,
      height: 60,
      backgroundColor: "rgba(237, 70, 70, 0.59)",
      borderColor: 'rgba(237, 70, 70, 0.59)',
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      marginVertical: 10,
      borderWidth: 2,
    },
    buttonText: {
      color: "white",
      fontSize: 30,
      fontFamily: "Grandstander",
      fontWeight: "600",
    },
    description: {
      width: 375,
      color: "white",
      fontSize: 22,
      fontFamily: "Grandstander",
      fontWeight: "600",
      textAlign: "center",
      marginVertical: 20,
    },
   scoreText: {
      color: "black",
      fontSize: 30,
      fontFamily: "Grandstander",
      fontWeight: "600",
      marginVertical: 20,
    },
    continueButton: {
      width: 350,
      height: 55,
      backgroundColor: "rgba(70, 195, 166, 0.65)",
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 80,
    },
    continueButtonText: {
      color: "white",
      fontSize: 35,
      fontFamily: "Grandstander",
      fontWeight: "600",
    },
    downwardPolygonRight: {
      marginTop: -10,
      width: 50, 
      height: 50, 
      right: -80,
      top: -20,
    },
    buttonClicked: {
      borderColor: 'yellow', 
      borderColor: 'yellow',
      borderWidht: 2,
    },
  });
  


