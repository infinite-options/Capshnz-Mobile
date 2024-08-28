import React, { useState } from 'react';
import { View, Text, Modal, ActivityIndicator, StyleSheet, Button } from 'react-native';

const LoadingScreen = () => {
  const [show, setShow] = useState(true);

  const handleClose = () => setShow(false);

  return (
    <>
      {/* Uncomment if you want a button to show the modal again */}
      {/* <Button title="Launch demo modal" onPress={() => setShow(true)} /> */}

      <Modal
        transparent={true}
        animationType="slide"
        visible={show}
        onRequestClose={handleClose}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.modalText}>Wait while we add you back to the game</Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  // Uncomment if you have a button
  // button: {
  //   backgroundColor: 'blue',
  //   color: 'white',
  //   padding: 10,
  //   borderRadius: 5,
  //   textAlign: 'center',
  //   marginTop: 20,
  // },
});

export default LoadingScreen;
