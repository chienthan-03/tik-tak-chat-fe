import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, useColorModeValue } from '@chakra-ui/react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';

const EmojiPicker = ({ onEmojiSelect, disabled = false }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Đóng picker khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPicker]);

  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji.native);
    setShowPicker(false);
  };

  const togglePicker = () => {
    if (!disabled) {
      setShowPicker(!showPicker);
    }
  };

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box position="relative" display="inline-block">
      <IconButton
        ref={buttonRef}
        size="sm"
        variant="ghost"
        colorScheme="gray"
        icon={<EmojiEmotionsIcon />}
        onClick={togglePicker}
        disabled={disabled}
        aria-label="Select emoji"
        _hover={{
          bg: 'gray.100',
        }}
        _active={{
          bg: 'gray.200',
        }}
      />
      
      {showPicker && (
        <Box
          ref={pickerRef}
          position="absolute"
          bottom="100%"
          right="0"
          zIndex={1000}
          mb={2}
          bg={bgColor}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="md"
          boxShadow="lg"
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="light"
            set="native"
            showPreview={false}
            showSkinTones={false}
            emojiSize={20}
            perLine={8}
            maxFrequentRows={2}
            locale="en"
            previewPosition="none"
          />
        </Box>
      )}
    </Box>
  );
};

export default EmojiPicker;
