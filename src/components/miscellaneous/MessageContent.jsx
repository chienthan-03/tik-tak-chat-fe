import React, { useState } from "react";
import {
  Text,
  Image,
  Box,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { isOnlyEmojis, getEmojiSize } from "../../utils/emojiUtils";

const MessageContent = ({ message, isRemoved, fontSize, ...textProps }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Nếu là tin nhắn ảnh
  if (message.messageType === "image" && message.imageUrl && !isRemoved) {
    return (
      <>
        <VStack spacing={2} align="stretch">
          <Box
            position="relative"
            maxW="300px"
            borderRadius="12px"
            overflow="hidden"
            cursor="pointer"
            onClick={onOpen}
            _hover={{
              transform: "scale(1.02)",
              transition: "transform 0.2s",
            }}
          >
            {imageLoading && (
              <Center
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="gray.100"
                minH="150px"
              >
                <Spinner size="md" color="gray.500" />
              </Center>
            )}

            {imageError ? (
              <Center bg="gray.100" minH="150px" color="gray.500" fontSize="sm">
                Không thể tải ảnh
              </Center>
            ) : (
              <Image
                src={message.imageUrl}
                alt="Shared image"
                maxW="100%"
                maxH="300px"
                objectFit="cover"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                  display: imageLoading ? "none" : "block",
                }}
              />
            )}
          </Box>

          {/* Caption nếu có */}
          {message.content && (
            <Text
              fontSize={{ base: "0.9rem", sm: "1rem" }}
              whiteSpace="pre-wrap"
              wordBreak="break-word"
              lineHeight="1.4"
              px={2}
            >
              {message.content}
            </Text>
          )}
        </VStack>

        {/* Modal để xem ảnh full size */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent bg="transparent" boxShadow="none">
            <ModalCloseButton color="white" zIndex={2} />
            <ModalBody p={0}>
              <Image
                src={message.imageUrl}
                alt="Full size image"
                maxW="100%"
                maxH="80vh"
                objectFit="contain"
                borderRadius="md"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  }

  // Tin nhắn text thông thường
  const content = message.content || message;
  const emojiSize = getEmojiSize(content);
  const isEmojiOnly = isOnlyEmojis(content);

  return (
    <Text
      fontSize={fontSize || { base: "1rem", sm: "1.2rem" }}
      as={isRemoved ? "i" : "p"}
      whiteSpace="pre-wrap"
      wordBreak="break-word"
      lineHeight="1.4"
      style={{
        fontSize: isEmojiOnly ? emojiSize : undefined,
      }}
      {...textProps}
    >
      {content}
    </Text>
  );
};

export default MessageContent;
