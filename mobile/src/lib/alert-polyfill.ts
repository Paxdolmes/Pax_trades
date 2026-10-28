// Web build: react-native-web's Alert.alert does nothing, so errors and
// "are you sure?" questions would vanish. Route them to the browser's own dialogs.
// Phones use the real Alert (alert-polyfill.native.ts).
import { Alert, type AlertButton } from 'react-native';

Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  const text = message ? `${title}\n\n${message}` : title;
  const choices = (buttons ?? []).filter((b) => b.style !== 'cancel');
  const cancel = buttons?.find((b) => b.style === 'cancel');
  if (choices.length === 0 || (choices.length === 1 && !cancel)) {
    window.alert(text);
    choices[0]?.onPress?.();
    return;
  }
  // One question per choice, e.g. "Standard, 15%?" then "Founding, 10%?".
  for (const choice of choices) {
    const question = choices.length === 1 ? text : `${text}\n\n${choice.text}?`;
    if (window.confirm(question)) return void choice.onPress?.();
  }
  cancel?.onPress?.();
};
