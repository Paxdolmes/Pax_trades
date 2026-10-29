import { Platform } from 'react-native';

// Until Relay opens, the website takes waiting-list sign-ups instead of bookings.
// People can still look through every booking screen; the last step sends them to
// the waiting list instead of booking. The phone apps keep booking for testing.
// Set to false on launch day.
export const WAITLIST = Platform.OS === 'web';
