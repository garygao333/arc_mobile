import React from 'react';
import { TextInput, StyleSheet, TextInputProps, Platform } from 'react-native';

interface NumberInputProps extends TextInputProps {
  // Add any additional props you want to support
}

const NumberInput: React.FC<NumberInputProps> = ({
  style,
  keyboardType,
  ...props
}) => {
  // Determine the keyboard type based on the input type
  const getKeyboardType = () => {
    if (keyboardType) return keyboardType;
    return Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default';
  };

  return (
    <TextInput
      {...props}
      style={[styles.input, style]}
      keyboardType={getKeyboardType()}
      returnKeyType="done"
      blurOnSubmit={true}
      onSubmitEditing={props.onSubmitEditing || (() => {})}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
});

export default NumberInput;
