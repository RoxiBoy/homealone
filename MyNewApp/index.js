/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import BackgroundFetch from 'react-native-background-fetch';
import {backgroundTask} from './src/services/BackgroundService';

AppRegistry.registerComponent(appName, () => App);

BackgroundFetch.registerHeadlessTask(async event => {
  const {taskId} = event;
  console.log('[BackgroundFetch HeadlessTask] start:', taskId);
  await backgroundTask(taskId);
});
