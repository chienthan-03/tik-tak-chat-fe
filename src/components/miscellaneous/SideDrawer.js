import React, { useState } from "react";
import { Box, Text } from "@chakra-ui/layout";
import { Button } from "@chakra-ui/button";
import {
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  Input,
  DrawerFooter,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import LogoutIcon from "@mui/icons-material/Logout";
import { useDisclosure } from "@chakra-ui/hooks";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import {
  BellIcon,
  Search2Icon,
  SettingsIcon,
  ViewOffIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import { ChatState } from "../../Context/ChatProvider";
import ProfileModal from "./ProfileModal";
import { useHistory } from "react-router-dom";
import ChatLoading from "./ChatLoading";
import UserListItem from "../userAvatar/UserListItem";
import axios from "axios";
import { getSender } from "../../config/ChatLogic";
import NotificationBadge from "react-notification-badge";
import { Effect } from "react-notification-badge";

const SideDrawer = () => {
  const {
    setSelectedChat,
    user,
    setUser,
    chats,
    setChats,
    notification,
    setNotification,
  } = ChatState();
  const cloud_name = "de0ypji50";
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [onOpenSetting, setOnOpenSetting] = useState(false);
  const handleCloseSetting = () => setOnOpenSetting(false);
  const handleOpenSetting = () => setOnOpenSetting(true);
  const [onOpenLogout, setOnOpenLogout] = useState(false);
  const handleCloseLogOut = () => setOnOpenLogout(false);
  const handleOpenLogOut = () => setOnOpenLogout(true);
  const [pic, setPic] = useState();
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const history = useHistory();
  const LogoutHandle = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  const handleChangeName = (value) => setName(value);

  const postDetails = (pic) => {
    setLoading(true);
    if (pic === undefined) {
      toast({
        title: "Please select an Image!!",
        status: "warning",
        duration: 4000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    if (pic.type === "image/jpeg" || pic.type === "image/png") {
      const data = new FormData();
      data.append("file", pic);
      data.append("upload_preset", "Post-app");
      data.append("cloud_name", "de0ypji50");
      fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: "post",
        body: data,
      })
        .then((res) => res.json())
        .then((data) => {
          setPic(data.url.toString());
          console.log(data.url.toString());
          console.log(pic);
          setLoading(false);
        })
        .catch((err) => {
          console.log(err);
          setLoading(false);
        });
    } else {
      toast({
        title: "Please Select an Image!",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(true);
      return;
    }
  };

  const btnChossefile = () => {
    document.getElementById("ip").click();
  };

  const handleEditAccount = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put(
        "https://tik-tak-chat-be.onrender.com/api/user/editProfile",
        {
          pic: pic,
          name: name,
          idUser: user._id,
        },
        config
      );
      let userInfo = JSON.parse(localStorage.getItem("userInfo"));
      localStorage.removeItem("userInfo");
      userInfo.name = name;
      userInfo.pic = pic;
      localStorage.setItem("userInfo", JSON.stringify(userInfo));
      setUser(JSON.parse(localStorage.getItem("userInfo")));
      toast({
        title: "Edit Profile successfully!!",
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to edit profile",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      console.log(error.message);
    }
  };
  const handleSearch = async () => {
    if (!search) {
      toast({
        title: "Please enter something in search",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "top-left",
      });
      return;
    }
    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(
        `https://tik-tak-chat-be.onrender.com/api/user?search=${search}`,
        config
      );
      setLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-left",
      });
    }
  };
  const accessChat = async (userId) => {
    try {
      setLoadingChat(false);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.post(
        `https://tik-tak-chat-be.onrender.com/api/chat`,
        { userId },
        config
      );
      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setLoadingChat(false);
      setSelectedChat(data);
      onClose();
    } catch (error) {
      toast({
        title: "Error fetching the chat",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-left",
      });
    }
  };
  const handleEditPassword = async () => {
    if (newPassword.length < 6) {
      toast({
        title: "New password is is more than 6 characters",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "password does not match",
        status: "warning",
        duration: 3000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.put(
        `https://tik-tak-chat-be.onrender.com/api/user/editPass`,
        {
          email: user.email,
          password: password,
          newPassword: newPassword,
        },
        config
      );

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to edit password",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      console.log(error.message);
    }
  };

  return (
    <>
      <Box
        display="flex"
        flexDirection={{ base: "row-reverse", sm: "column" }}
        justifyContent={{ base: "center", sm: "space-between" }}
        alignItems="center"
        p={{ base: "0", sm: "30px 10px 20px 10px" }}
      >
        {" "}
        <IconButton borderRadius="50%">
          <ProfileModal user={user}>
            <Avatar
              w={{ base: "50px", lg: "64px" }}
              h={{ base: "50px", lg: "64px" }}
              cursor="pointer"
              name={user.name}
              src={user.pic}
            />
          </ProfileModal>
        </IconButton>
        <Box
          display="flex"
          flexDirection={{ base: "row", sm: "column" }}
          justifyContent="center"
        >
          <Tooltip label="Search Uses to chat" hasArrow placement="right">
            <IconButton
              onClick={onOpen}
              borderRadius={{ base: "0", sm: "50px" }}
              w={{ base: "76px", sm: "40px", lg: "56px" }}
              h={{ base: "60px", sm: "40px", lg: "56px" }}
              marginBottom={{ base: "0", sm: "20px" }}
              colorScheme="none"
              fontSize={{ base: "xl", sm: "2xl" }}
            >
              <Search2Icon />
            </IconButton>
          </Tooltip>
          <Tooltip label="Setting account" hasArrow placement="right">
            <IconButton
              borderRadius={{ base: "0", sm: "50px" }}
              w={{ base: "76px", sm: "40px", lg: "56px" }}
              h={{ base: "60px", sm: "40px", lg: "56px" }}
              marginBottom={{ base: "0", sm: "20px" }}
              onClick={handleOpenSetting}
              colorScheme="none"
              fontSize={{ base: "xl", sm: "2xl" }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Modal isOpen={onOpenSetting} onClose={handleCloseSetting}>
            <ModalOverlay />
            <ModalContent minWidth={{ base: "375px", sm: "560px" }}>
              <ModalCloseButton />
              <ModalBody>
                <Tabs isFitted variant="enclosed" marginTop="40px">
                  <TabList mb="1em">
                    <Tab>Edit profile</Tab>
                    <Tab>Edit password</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel display="flex" flexDirection="column">
                      <Text fontSize="4xl" marginTop="20px">
                        Edit profile
                      </Text>
                      <Box
                        marginTop="20px"
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Avatar
                          src={pic ? pic : user?.pic}
                          sx={{ width: 140, height: 140 }}
                        />
                        <input
                          id="ip"
                          type="file"
                          accept="image/*"
                          onChange={(e) => postDetails(e.target.files[0])}
                          style={{ display: "none" }}
                        />
                        <Button onClick={btnChossefile}>Chosse photo</Button>
                      </Box>
                      <Input
                        placeholder="Enter your full name..."
                        marginTop="20px"
                        size="lg"
                        value={name}
                        onChange={(e) => handleChangeName(e.target.value)}
                      />
                      <Button
                        position="relative"
                        left="75%"
                        w={{ base: "74px", sm: "120px" }}
                        marginTop="20px"
                        onClick={handleEditAccount}
                      >
                        Save
                      </Button>
                    </TabPanel>
                    <TabPanel>
                      <Text fontSize="4xl" marginTop="20px">
                        Edit password
                      </Text>
                      <InputGroup size="md">
                        <Input
                          placeholder="Enter your password..."
                          marginTop="20px"
                          size="lg"
                          type={show ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <InputRightElement width="4.5rem" marginTop="24px">
                          <Button h="1.75rem" size="sm" onClick={handleClick}>
                            {show ? (
                              <ViewOffIcon color="#333" />
                            ) : (
                              <ViewIcon color="#333" />
                            )}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                      <InputGroup size="md">
                        <Input
                          placeholder="Enter new password..."
                          marginTop="20px"
                          size="lg"
                          type={show ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <InputRightElement width="4.5rem" marginTop="24px">
                          <Button h="1.75rem" size="sm" onClick={handleClick}>
                            {show ? (
                              <ViewOffIcon color="#333" />
                            ) : (
                              <ViewIcon color="#333" />
                            )}
                          </Button>
                        </InputRightElement>
                      </InputGroup>
                      <InputGroup size="md">
                        <Input
                          placeholder="Enter confirm password..."
                          marginTop="20px"
                          size="lg"
                          value={confirmPassword}
                          type={show ? "text" : "password"}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <InputRightElement width="4.5rem" marginTop="24px">
                          <Button h="1.75rem" size="sm" onClick={handleClick}>
                            {show ? (
                              <ViewOffIcon color="#333" />
                            ) : (
                              <ViewIcon color="#333" />
                            )}
                          </Button>
                        </InputRightElement>
                      </InputGroup>

                      <Button
                        position="relative"
                        left="75%"
                        w={{ base: "74px", sm: "120px" }}
                        marginTop="20px"
                        size="lg"
                        onClick={handleEditPassword}
                      >
                        Save
                      </Button>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </ModalBody>
            </ModalContent>
          </Modal>

          <Menu>
            <Tooltip label="Notifications" hasArrow placement="right">
              <MenuButton marginBottom={{ base: "0", sm: "20px" }}>
                <IconButton
                  borderRadius={{ base: "0", sm: "50px" }}
                  w={{ base: "76px", sm: "40px", lg: "56px" }}
                  h={{ base: "60px", sm: "40px", lg: "56px" }}
                  colorScheme="none"
                  fontSize={{ base: "2xl", sm: "4xl" }}
                >
                  <BellIcon />
                </IconButton>
                <NotificationBadge
                  style={{ position: "absolute", top: "-56px" }}
                  count={notification.length}
                  effect={Effect.SCALE}
                />
              </MenuButton>
            </Tooltip>
            <MenuList pl={2}>
              {!notification.length && "No new message"}
              {notification.map((notif) => (
                <MenuItem
                  key={notif._id}
                  onClick={() => {
                    setSelectedChat(notif.chat);
                    setNotification(notification.filter((n) => n !== notif));
                  }}
                >
                  {notif.chat.isGroupChat ? (
                    <>
                      New message in &nbsp; <b>{notif.chat.chatName}</b>
                    </>
                  ) : (
                    <>
                      New message from &nbsp;{" "}
                      <b>{getSender(user, notif.chat.users)}</b>
                    </>
                  )}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Box>
        <Tooltip label="Log out" hasArrow placement="right">
          <IconButton
            onClick={handleOpenLogOut}
            colorScheme="none"
            fontSize="xl"
            borderRadius={{ base: "0", sm: "50px" }}
            w={{ base: "76px", sm: "40px", lg: "56px" }}
            h={{ base: "60px", sm: "40px", lg: "56px" }}
          >
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Modal isOpen={onOpenLogout} onClose={handleCloseLogOut}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>You want to sign out?</ModalHeader>
          <ModalCloseButton />
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={handleCloseLogOut}>
              Close
            </Button>
            <Button colorScheme="red" color="#fff" onClick={LogoutHandle}>
              Log out
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Drawer onClose={onClose} isOpen={isOpen} placement="left">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Search User</DrawerHeader>
          <DrawerBody>
            <Box display={"flex"} pb={2}>
              <Input
                placeholder="Search by name or email"
                mr={2}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              ></Input>
              <Button onClick={handleSearch} colorScheme="facebook">
                Search
              </Button>
            </Box>
            {loading ? (
              <ChatLoading />
            ) : searchResult.length === 0 ? (
              <Text fontSize="xl" textAlign="center">
                No result <SearchOffIcon />
              </Text>
            ) : (
              searchResult?.map((user) => (
                <UserListItem
                  key={user._id}
                  user={user}
                  handleFunction={() => accessChat(user._id)}
                />
              ))
            )}
            {loadingChat && <Spinner ml="auto" display="flex" />}
          </DrawerBody>

          <DrawerFooter>
            <Button variant="outline" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="facebook">Save</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default SideDrawer;
