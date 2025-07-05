import { TimerMachineState, SessionMachineState } from './session-machine-types';

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getCurrentTimerState = (snapshot: any) => {
  if (typeof snapshot.value === 'string') {
    return TimerMachineState.idle;
  }
  return Object.values(snapshot.value)[0];
};

export const getCurrentSessionState = (snapshot: any) => {
  if (typeof snapshot.value === 'string') {
    return snapshot.value;
  }
  return Object.keys(snapshot.value)[0];
}; 