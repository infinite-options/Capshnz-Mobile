import React, { useState, useEffect, useCallback } from "react";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import useAbly from "../util/ably";
import { View, Text, Button, Image, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function ChooseroundToWaitingRoom() {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params);
  const [members, setMembers] = useState([]);
  const [isLoading, setLoading] = useState(false);

  const {
    publish,
    subscribe,
    onMemberUpdate,
    getMembers,
    addMember,
    removeMember,
    getChannel,
    channel,
  } = useAbly(userData.gameCode);

  const refreshLobby = async () => {
    try {
      const membersList = await getMembers();
      setMembers(membersList);
      console.log("Updated members:", membersList.length);
    } catch (error) {
      console.log("Error in refreshLobby:", error);
    }
  };

  const initializeLobby = async () => {
    try {
      await onMemberUpdate(refreshLobby);
    //   const membersList = await getMembers();
    //    setMembers(membersList);
    //  await addMember(userData.playerUID, { alias: userData.alias });
    //  refreshLobby(); 
    } catch (error) {
      console.log("Error in initializeLobby:", error);
    }
  };

  useEffect(() => {
    initializeLobby();

    return () => {

    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  const waitingRoomButton = () => {
    navigation.navigate("TransitionPage3", { ...userData });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.navigate("StartGame", userData)}
      >
        <Text style={styles.closeButtonText}>X</Text>
      </TouchableOpacity>

      <TextInput style={styles.input} editable={false}>
        Waiting for all Players . . .
      </TextInput>

      <Image
        source={require('../assets/polygon-downwards-white.png')}
        style={styles.downwardPolygonRight}
      />

      <View style={styles.container}>
        <Text style={styles.emptyMessage}>Ably Call 1 - await getMembers() - {members.length}</Text>
        <Text style={styles.emptyMessage}>Ably Call 2 - await onMemberUpdate() - {members.length}</Text>
        <Text style={styles.emptyMessage}>Ably Call 3 - await addMember</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={waitingRoomButton}
      >
        <Text style={styles.buttonText}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flex: 1,
    alignItems: "center",
    backgroundColor: "#CBDFBD",
    padding: 16,
    paddingTop: 50,
    marginTop: 20,
  },
  input: {
    width: '80%',
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
  closeButton: {
    width: 24,
    height: 24,
    position: 'absolute',
    top: 20,
    right: 20,
  },
  downwardPolygonRight: {
    marginTop: -10,
    width: 50,
    height: 50,
    right: -80,
    bottom: 10,
  },
  emptyMessage: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "black",
  },
  button: {
    width: 330,
    height: 55,
    backgroundColor: "#DC816A",
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
});
