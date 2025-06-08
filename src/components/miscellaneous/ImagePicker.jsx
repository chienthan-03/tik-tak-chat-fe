import React, { useState, useRef } from 'react';
import {
  Box,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Image,
  Text,
  Input,
  VStack,
  HStack,
  useToast,
  Spinner,
  Center,
} from '@chakra-ui/react';
import ImageIcon from '@mui/icons-material/Image';

const ImagePicker = ({ onImageSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();

  // Các định dạng file được hỗ trợ
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Kiểm tra định dạng file
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Định dạng file không hỗ trợ',
        description: 'Chỉ hỗ trợ JPG, PNG, GIF, và WebP',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Kiểm tra kích thước file
    if (file.size > maxFileSize) {
      toast({
        title: 'File quá lớn',
        description: 'Kích thước file không được vượt quá 5MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSelectedImage(file);

    // Tạo preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setIsOpen(true);
  };

  const handleSend = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    try {
      await onImageSelect(selectedImage, caption);
      handleClose();
      toast({
        title: 'Gửi ảnh thành công',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Lỗi khi gửi ảnh',
        description: error.message || 'Có lỗi xảy ra',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
    setCaption('');
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <IconButton
        size="sm"
        variant="ghost"
        colorScheme="gray"
        icon={<ImageIcon />}
        onClick={openFileDialog}
        disabled={disabled}
        aria-label="Select image"
        _hover={{
          bg: 'gray.100',
        }}
        _active={{
          bg: 'gray.200',
        }}
      />

      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Gửi ảnh</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {imagePreview && (
                <Box
                  maxW="100%"
                  maxH="300px"
                  overflow="hidden"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.200"
                >
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    maxW="100%"
                    maxH="300px"
                    objectFit="contain"
                  />
                </Box>
              )}
              
              <Input
                placeholder="Thêm chú thích (tùy chọn)..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                disabled={isUploading}
              />
              
              {selectedImage && (
                <Text fontSize="sm" color="gray.500">
                  {selectedImage.name} ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB)
                </Text>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleClose} disabled={isUploading}>
                Hủy
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSend}
                disabled={!selectedImage || isUploading}
              >
                {isUploading ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text>Đang gửi...</Text>
                  </HStack>
                ) : (
                  'Gửi'
                )}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ImagePicker;
