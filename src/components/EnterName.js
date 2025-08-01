import React, { useState } from 'react';
import { StyleSheet, ImageBackground, Text, View, TextInput, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addUser } from '../util/Api';

export default function EnterName() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = route.params;

  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [prevName, setPrevName] = useState('');
  const [prevAlias, setPrevAlias] = useState('');

  const handleNameChange = (text) => {
    setName(text);
  };

  const handleAliasChange = (text) => {
    setAlias(text);
  };

  const hasAnyNameChanged = () => {
    return prevName !== name || prevAlias !== alias;
  };

  const handleSubmit = async (event) => {
    try {
      event.preventDefault();

      const updatedUserData = {
        ...userData,
        name,
        alias,
      };

      if (hasAnyNameChanged()) {
        try {
          await addUser(updatedUserData);
        } catch (error) {
          console.error('Error adding user:', error);
        }
      }

      if (userData.user_code === "TRUE") {
        navigation.navigate("StartGame", { ...updatedUserData });
      } else {
        navigation.navigate("VerificationOtp", { ...updatedUserData });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/landing-new.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.centered}>
        {/* Fixed: Use Text instead of TextInput */}
        <Text style={styles.header}>Welcome to Capshnz!</Text>

        <Image
          source={require('../assets/polygon-downwards-white.png')}
          style={styles.downwardPolygonLeft}
        />

        <TextInput
          style={styles.input}
          value={name}
          placeholder="Enter name here..."
          onChangeText={handleNameChange}
        />

        <Image
          source={require('../assets/polygon-downwards-white.png')}
          style={styles.downwardPolygonRight}
        />

        <Image
          source={require('../assets/polygon-upward-white.png')}
          style={styles.upwardPolygonLeft}
        />

        <TextInput
          style={styles.input}
          value={alias}
          placeholder="Enter screen name here..."
          onChangeText={handleAliasChange}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
        >
          <Text style={styles.buttonText}>Enter</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  centered: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  header: {
    width: '80%',
    height: 60,
    backgroundColor: 'white',
    borderRadius: 30,
    fontSize: 26,
    fontFamily: 'Grandstander',
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
    paddingTop: 15,
    overflow: 'hidden',
  },
  downwardPolygonLeft: {
    marginTop: -10,
    width: 50,
    height: 50,
    right: 100,
    bottom: 10,
  },
  downwardPolygonRight: {
    marginTop: -10,
    width: 50,
    height: 50,
    right: -80,
    bottom: 10,
  },
  upwardPolygonLeft: {
    marginTop: -10,
    width: 50,
    height: 50,
    right: 100,
    bottom: -30,
  },
  input: {
    width: '80%',
    height: 60,
    backgroundColor: 'white',
    borderRadius: 30,
    fontSize: 26,
    fontFamily: 'Grandstander',
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  button: {
    width: '50%',
    height: 50,
    backgroundColor: '#46C3A6',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Grandstander',
    fontWeight: '600',
  },
});
