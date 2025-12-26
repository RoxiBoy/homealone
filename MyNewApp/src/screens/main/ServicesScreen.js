import React, {useContext} from 'react';
import {View, Button, StyleSheet} from 'react-native';
import {ActivityContext} from '../../contexts/ActivityContext';

const ServicesScreen = () => {
  const {updateCheckInTime} = useContext(ActivityContext);

  // 10 seconds in hours (10s / 3600s)
  const setTestCheckIn = () => {
    const shortTime = 5 / 3600;
    updateCheckInTime(shortTime);
    console.log('[ServicesScreen] Check-in time set to 10 seconds (test)');
  };

  const restoreDefault = () => {
    updateCheckInTime(4); // back to 4 hours
    console.log('[ServicesScreen] Check-in time restored to 4 hours');
  };

  return (
    <View style={styles.container}>
      <Button title="Set Test Check-In (10s)" onPress={setTestCheckIn} />
      <Button title="Restore Default (4h)" onPress={restoreDefault} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ServicesScreen;
