import React, {useContext} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createDrawerNavigator} from '@react-navigation/drawer';
import {AuthContext} from '../contexts/AuthContext';

import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';

import DashboardScreen from '../screens/main/DashboardScreen';
import TipsScreen from '../screens/main/TipsScreen';
import ProductsScreen from '../screens/main/ProductsScreen';
import ServicesScreen from '../screens/main/ServicesScreen';

import FriendsScreen from '../screens/menu/FriendsScreen';
import CheckInTimesScreen from '../screens/menu/CheckInTimesScreen';
import EmergencyServicesScreen from '../screens/menu/EmergencyServicesScreen';
import DoNotDisturbScreen from '../screens/menu/DoNotDisturbScreen';
import NotificationsScreen from '../screens/menu/NotificationsScreen';
import RemindersScreen from '../screens/menu/RemindersScreen';
import AccountDetailsScreen from '../screens/menu/AccountDetailsScreen';
import PaymentsScreen from '../screens/menu/PaymentsScreen';

import CustomDrawerContent from '../components/CustomDrawerContent';
import LoadingScreen from '../screens/LoadingScreen';
import EmergencyContactScreen from '../screens/menu/EmergencyContactScreen';
import AddReminderScreen from '../screens/menu/AddReminderScreen';

import CheckInScreen from '../screens/CheckInScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Tips" component={TipsScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Services" component={ServicesScreen} />
    </Tab.Navigator>
  );
};

const MenuStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Friends" component={FriendsScreen} />
      <Stack.Screen name="CheckInTimes" component={CheckInTimesScreen} />
      <Stack.Screen
        name="EmergencyServices"
        component={EmergencyServicesScreen}
      />
      <Stack.Screen
        name="EmergencyContact"
        component={EmergencyContactScreen}
      />
      <Stack.Screen name="DoNotDisturb" component={DoNotDisturbScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} />
      <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
    </Stack.Navigator>
  );
};

const MainDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={props => <CustomDrawerContent {...props} />}>
      <Drawer.Screen name="Home" component={MainTabs} />
      <Drawer.Screen name="Menu" component={MenuStack} />
    </Drawer.Navigator>
  );
};

const AppNavigator = () => {
  const {isLoading, userToken} = useContext(AuthContext);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {userToken ? (
        <>
          <Stack.Screen name="Main" component={MainDrawer} />
          <Stack.Screen name="CheckInScreen" component={CheckInScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
