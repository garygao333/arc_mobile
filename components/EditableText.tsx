import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextStyle, ViewStyle, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditableTextProps {
  value: string;
  onSave: (newValue: string) => Promise<boolean | void>;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  inputStyle?: TextStyle;
  iconSize?: number;
  iconColor?: string;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onSave,
  style,
  containerStyle,
  textStyle,
  inputStyle,
  iconSize = 16,
  iconColor = '#007AFF',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Update local state when value prop changes
  useEffect(() => {
    setEditedValue(value);
  }, [value]);

  const handleSave = async () => {
    console.log('handleSave called with value:', editedValue);
    try {
      if (editedValue.trim() === '') {
        console.log('Validation failed: Empty value');
        Alert.alert('Error', 'Value cannot be empty');
        return false;
      }

      if (editedValue === value) {
        console.log('No changes to save');
        setIsEditing(false);
        return true;
      }

      console.log('Attempting to save value...');
      setIsSaving(true);
      const success = await onSave(editedValue);
      
      console.log('onSave result:', success);
      if (success !== false) {
        console.log('Save successful, closing editor');
        setIsEditing(false);
        return true;
      }
      console.log('Save returned false');
      return false;
    } catch (error) {
      console.error('Error in handleSave:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
      setEditedValue(value); // Revert to original value on error
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: any) => {
    console.log('Key pressed:', e.nativeEvent.key);
    if (e.nativeEvent.key === 'Enter') {
      console.log('Enter key pressed, saving...');
      e.preventDefault();
      handleSave();
    }
  };

  const handleCancel = () => {
    // Revert to the original value when canceling
    setEditedValue(value);
    setTimeout(() => {
      setIsEditing(false);
    }, 0);
  };

  if (isEditing) {
    return (
      <View style={[styles.editContainer, containerStyle]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle, style]}
          value={editedValue}
          onChangeText={(text) => {
            console.log('Text changed to:', text);
            setEditedValue(text);
          }}
          autoFocus
          editable={!isSaving}
          onSubmitEditing={handleSave}
          onKeyPress={handleKeyPress}
          onBlur={() => {
            console.log('Input blurred, saving...');
            handleSave();
          }}
          returnKeyType="done"
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={true}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          selectTextOnFocus
        />
        {!isSaving && (
          <>
            <TouchableOpacity onPress={handleSave} style={styles.iconButton}>
              <Ionicons name="checkmark" size={iconSize} color="green" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
              <Ionicons name="close" size={iconSize} color="red" />
            </TouchableOpacity>
          </>
        )}
        {isSaving && (
          <View style={styles.loadingContainer}>
            <Ionicons name="ellipsis-horizontal" size={iconSize} color="#999" />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.viewContainer, containerStyle]}>
      <Text style={[styles.text, textStyle, style]}>{value}</Text>
      <TouchableOpacity 
        onPress={() => setIsEditing(true)} 
        style={styles.iconButton}
        disabled={isSaving}
      >
        <Ionicons name="pencil" size={iconSize} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  viewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
  },
  text: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    padding: 4,
    marginRight: 8,
    minWidth: 100,
    color: '#000',
    paddingVertical: 8,
  },
  iconButton: {
    padding: 4,
    marginLeft: 4,
  },
  loadingContainer: {
    padding: 4,
    marginLeft: 4,
  },
});

export default EditableText;
