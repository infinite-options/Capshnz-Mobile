import React from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function GameRules() {
  const navigation = useNavigation();

  function goBackButton() {
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        <Button title="Back to Previous Page" onPress={goBackButton} color="#f9dd25" />
      </View>
      <View style={styles.headerGameRules}>
        <Text style={styles.headerText}>Game Rules</Text>
      </View>
      <ScrollView style={styles.listGameRules}>
        <Text style={styles.sectionTitle}><Text style={styles.underline}>Game Setup Information</Text></Text>
        <Text style={styles.subHeader}>HOST</Text>
        <Text style={styles.listItem}>1. Enter Name, Email, Alias and Zipcode</Text>
        <Text style={styles.listItem}>2. Select "Create New Game" to get Game Code</Text>
        <Text style={styles.listItem}>3. Select Number of Rounds and Round Time</Text>
        <Text style={styles.listItem}>4. Share Game Code with other players</Text>
        <Text style={styles.listItem}>5. Select Game Deck</Text>
        <Text style={styles.listItem}>6. Select Start Game</Text>

        <Text style={styles.subHeader}>PLAYERS</Text>
        <Text style={styles.listItem}>1. Enter Name, Email, Alias and Zipcode</Text>
        <Text style={styles.listItem}>2. Enter Game Code</Text>
        <Text style={styles.listItem}>3. Select "Join Game"</Text>

        <Text style={styles.sectionTitle}><Text style={styles.underline}>Google Photos Instructions</Text></Text>
        <Text style={styles.listItem}>In Google Photos</Text>
        <Text style={styles.listItem}>1. Select photos in Google Photos</Text>
        <Text style={styles.listItem}>2. Create Shared Album</Text>

        <Text style={styles.listItem}>In game</Text>
        <Text style={styles.listItem}>1. Click Select Game Deck</Text>
        <Text style={styles.listItem}>2. Select Google Photos Icon</Text>
        <Text style={styles.listItem}>3. Log in to Google</Text>
        <Text style={styles.listItem}>4. Select Shared Album</Text>

        <Text style={styles.sectionTitle}><Text style={styles.underline}>Game Play Instructions</Text></Text>
        <Text style={styles.listItem}>1. Each player should enter a Caption within the allotted time</Text>
        <Text style={styles.listItem}>2. Once all captions are submitted (or time runs out), Each player votes for the best Caption (you cannot vote for you own Caption)</Text>
        <Text style={styles.listItem}>3. Once all votes are in, review the scoreboard before playing the next round</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 440,
    height: 812,
    flex: 1,
    padding: 20,
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonGameRules: {
    width: 275,
    height: 50,
    borderWidth: 3,
    borderRadius: 25,
    borderColor: 'black',
    fontFamily: 'Josefin Sans',
    fontWeight: 'bold',
    fontSize: 20,
    color: 'black',
    backgroundColor: '#f9dd25',
    alignSelf: 'center',
    marginTop: 20,
  },
  headerGameRules: {
    fontFamily: 'Josefin Sans',
    fontSize: 20,
    fontWeight: 'bold',
    position: 'absolute',
    top: 85,
    left: 131,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  listGameRules: {
    fontFamily: 'Josefin Sans',
    fontWeight: '300',
    fontSize: 20,
    position: 'absolute',
    top: 135,
    left: 19,
    right: 16,
    bottom: 161,
    textAlign: 'left',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  subHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  listItem: {
    fontSize: 16,
    marginVertical: 2,
  },
  underline: {
    textDecorationLine: 'underline',
  },
});
