import { useState } from "react";
import { useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, Text, View, ImageBackground, TextInput, Button, TouchableOpacity,ScrollView  } from 'react-native';
//import { useNavigate, Link } from "react-router-dom";
//import Cookies from '@react-native-cookies/cookies';
import { addUser } from "../util/Api";
//import { Col, Container, Row } from "react-bootstrap";
//import Form from "react-bootstrap/Form";
//import Button from "react-bootstrap/Button";



export default function UserInfo() {
  const navigation = useNavigation();
  const route = useRoute();
  const{userData}= route.params;
  //const [name, setName] = useState(userData.name);
  //const [alias, setAlias] = useState(userData.alias);


  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [prevName, setPrevName] = useState('');
  const [prevAlias, setPrevAlias] = useState('');


  const handleNameChange = (text) => {
    setName(text);
/*
    if (text.length < 3) {
      setNameInvalid(true);
    } else {
      setNameInvalid(false);
    }*/
  };

  const handleAliasChange = (text) => {
    setAlias(text);
  };

  const hasAnyNameChanged = () => {
   // const { prevName, prevAlias } = userData;
    if (prevName !== name || prevAlias !== alias) return true;
    return false;
  };

  const handleSubmit = async (event) => {
    try {
      event.preventDefault();
      const updatedUserData = {
        ...userData,
        name,
        alias,
      };
      // console.log("Calling Add User from hasAnyNameChanged")
      if (hasAnyNameChanged()) await addUser(updatedUserData);
      if (userData.user_code === "TRUE")
        navigate("JoinGame", { state: updatedUserData });
        // navigate("/StartGame", { state: updatedUserData });
      else navigate("/Confirmation", { state: updatedUserData });
    } catch (err) {
      console.error(err);
    }
  };

    return (
        <ImageBackground
        source={require('../assets/landing-new.png')}
        style={styles.backgroundImage}
      >
          <View style={styles.overlay}>
          
        <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Welcome to Capshnz!</Text>
        <View style={styles.formGroup}>
          <TextInput
            style={[styles.input]}
            value={name}
            placeholder="Enter your name here..."
            onChangeText={handleNameChange}
          />
        </View>
        <View style={styles.formGroup}>
          <TextInput
           style={[styles.input]}
            value={alias}
            placeholder="Enter screen name here..."
            onChangeText={handleAliasChange}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Button title="Enter" onPress={handleSubmit} color="#28a745" />
        </View>
      </ScrollView>
      </View>
      </ImageBackground>
    );
};

    
const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover', 
        justifyContent: 'center',
      },
      overlay: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.5)', 
      },
    container: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 16,
      },
      formGroup: {
        marginBottom: 20,
      },
      label: {
        fontSize: 16,
        marginBottom: 10,
      },
      input: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
        paddingHorizontal: 10,
        backgroundColor: "white",
      },
      inputInvalid: {
        borderColor: "red",
      },
      header: {
        height: 40,
        borderColor: "gray",
        borderWidth: 1,
        paddingHorizontal: 10,
        backgroundColor: "white",
  
      },
      buttonContainer: {
        marginTop: 20,
        alignItems: "center",
      },
  });  
