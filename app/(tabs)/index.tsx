import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@task_history';

export default function App() {
  const [phase, setPhase] = useState('input');
  const [taskName, setTaskName] = useState('');
  const [expectedMinutes, setExpectedMinutes] = useState('');
  const [actualSeconds, setActualSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [history, setHistory] = useState([]);
  
  const intervalRef = useRef(null);

  useEffect(() => {
    loadHistory();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setHistory(JSON.parse(data));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveTask = async (task) => {
    try {
      const updatedHistory = [task, ...history].slice(0, 5);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const startTimer = () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }
    const expected = parseInt(expectedMinutes);
    if (isNaN(expected) || expected <= 0) {
      Alert.alert('Error', 'Please enter a valid expected time (minutes)');
      return;
    }

    setCurrentTask({
      name: taskName,
      expectedTime: expected,
    });
    setActualSeconds(0);
    setTimerActive(true);
    setPhase('running');

    intervalRef.current = setInterval(() => {
      setActualSeconds(prev => prev + 1);
    }, 1000);
  };

  const finishTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerActive(false);
    
    const actualMinutes = actualSeconds / 60;
    const difference = actualMinutes - currentTask.expectedTime;
    
    const completedTask = {
      id: Date.now(),
      name: currentTask.name,
      expectedTime: currentTask.expectedTime,
      actualTime: actualMinutes,
      difference: difference,
      timestamp: new Date().toLocaleString(),
    };
    
    saveTask(completedTask);
    setCurrentTask(completedTask);
    setPhase('result');
  };

  const resetApp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTaskName('');
    setExpectedMinutes('');
    setActualSeconds(0);
    setTimerActive(false);
    setCurrentTask(null);
    setPhase('input');
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDifferenceMessage = (difference) => {
    if (difference < 0) {
      return `✨ You were faster by ${Math.abs(difference).toFixed(1)} minutes`;
    } else if (difference > 0) {
      return `⏰ You took longer by ${difference.toFixed(1)} minutes`;
    } else {
      return '🎯 Perfect timing!';
    }
  };

  const getDifferenceStyle = (difference) => {
    if (difference < 0) return styles.faster;
    if (difference > 0) return styles.slower;
    return styles.perfect;
  };

  if (phase === 'input') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
            <Text style={styles.title}>Time Reality Check</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.subtitle}>Step 1: Enter task details</Text>
            <Text style={styles.label}>Task Name</Text>
            <TextInput
              style={styles.input}
              value={taskName}
              onChangeText={setTaskName}
              placeholder="e.g., Study Math"
              placeholderTextColor="#999"
            />
            <Text style={styles.label}>Expected Time (minutes)</Text>
            <TextInput
              style={styles.input}
              value={expectedMinutes}
              onChangeText={setExpectedMinutes}
              placeholder="e.g., 30"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.button} onPress={startTimer}>
              <Text style={styles.buttonText}>Start Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (phase === 'running') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
            <Text style={styles.title}>Time Reality Check</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.subtitle}>Step 2: Stay focused</Text>
            <Text style={styles.taskNameRunning}>{currentTask?.name}</Text>
            <Text style={styles.timer}>{formatTime(actualSeconds)}</Text>
            <Text style={styles.expectedInfo}>
              Expected: {currentTask?.expectedTime} min
            </Text>
            <TouchableOpacity style={styles.buttonFinish} onPress={finishTimer}>
              <Text style={styles.buttonText}>Finish Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (phase === 'result') {
    const diffMessage = getDifferenceMessage(currentTask?.difference || 0);
    const diffStyle = getDifferenceStyle(currentTask?.difference || 0);
    
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
            <Text style={styles.title}>Time Reality Check</Text>
          </View>
          <View style={styles.stepContainer}>
            <Text style={styles.subtitle}>Step 3: Review your progress</Text>
            <Text style={styles.resultTitle}>Task Completed! 🎉</Text>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Task:</Text>
              <Text style={styles.resultValue}>{currentTask?.name}</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Expected:</Text>
              <Text style={styles.resultValue}>{currentTask?.expectedTime} minutes</Text>
            </View>
            
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Actual:</Text>
              <Text style={styles.resultValue}>{currentTask?.actualTime?.toFixed(1)} minutes</Text>
            </View>
            
            <View style={[styles.diffContainer, diffStyle]}>
              <Text style={styles.diffText}>{diffMessage}</Text>
            </View>
            
            <TouchableOpacity style={styles.button} onPress={resetApp}>
              <Text style={styles.buttonText}>Start New Task</Text>
            </TouchableOpacity>
          </View>
        </View>

        {history.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>📋 Last 5 Tasks</Text>
            {history.map((task, index) => {
              const taskDiffStyle = getDifferenceStyle(task.difference);
              const taskDiffMessage = getDifferenceMessage(task.difference);
              return (
                <View key={task.id || index} style={styles.stepContainer}>
                  <Text style={styles.historyTaskName}>{task.name}</Text>
                  <Text style={styles.historyTime}>
                    Expected: {task.expectedTime}min | Actual: {task.actualTime?.toFixed(1)}min
                  </Text>
                  <Text style={[styles.historyDiff, taskDiffStyle]}>
                    {taskDiffMessage}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#A1CEDC',
    padding: 20,
    paddingBottom: 70,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 90,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logo: {
    height: 40,
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D3D47',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A1CEDC',
    marginBottom: 16,
  },
  stepContainer: {
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#A1CEDC',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#333',
  },
  button: {
    backgroundColor: '#A1CEDC',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonFinish: {
    backgroundColor: '#ff6b6b',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#1D3D47',
    fontSize: 18,
    fontWeight: '600',
  },
  taskNameRunning: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1D3D47',
    textAlign: 'center',
    marginVertical: 10,
  },
  timer: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#A1CEDC',
    textAlign: 'center',
    marginVertical: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  expectedInfo: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D3D47',
    textAlign: 'center',
    marginVertical: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#A1CEDC',
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  resultValue: {
    fontSize: 16,
    color: '#1D3D47',
    fontWeight: '500',
  },
  diffContainer: {
    padding: 15,
    borderRadius: 12,
    marginVertical: 20,
    alignItems: 'center',
  },
  diffText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  faster: {
    backgroundColor: '#4CAF50',
  },
  slower: {
    backgroundColor: '#ff6b6b',
  },
  perfect: {
    backgroundColor: '#ffa500',
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1D3D47',
    marginBottom: 16,
  },
  historyTaskName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D3D47',
  },
  historyTime: {
    fontSize: 14,
    color: '#777',
  },
  historyDiff: {
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    color: 'white',
  },
});