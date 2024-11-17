import { useEffect, useState } from "react";
import {
  VStack,
  Input,
  FormControl,
  FormLabel,
  InputRightElement,
  Button,
  InputGroup,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import axios from "axios";
import { useHistory } from "react-router";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

const Signup = () => {
  const [show, setShow] = useState(false);
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [confirmpassword, setConfirmpassword] = useState();
  const [password, setPassword] = useState();
  const [pic, setPic] = useState();
  const [loading, setLoading] = useState(false);

  const cloud_name = "vote";
  const toast = useToast();
  const history = useHistory();

  const handleShow = () => setShow(!show);

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
      data.append("upload_preset", "chat-app");
      data.append("cloud_name", "vote");
      fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: "post",
        body: data,
      })
        .then((res) => res.json())
        .then((data) => {
          setPic(data.url.toString());
          console.log(data.url.toString());
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
  const submitHandle = async () => {
    setLoading(false);
    if (!name || !email || !password || !confirmpassword) {
      toast({
        title: "Please Fill all the Feilds",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(true);
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Password must on 6 character",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    if (!isValidEmail(email)) {
      toast({
        title: "Invalid email",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    if (password !== confirmpassword) {
      toast({
        title: "Passwords Do Not Match",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };
      const { data } = await axios.post(
        "https://tik-tak-chat-be.onrender.com/api/user",
        {
          name,
          email,
          password,
          pic,
        },
        config
      );
      console.log(data);
      toast({
        title: "Registration Successful",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      localStorage.setItem("userInfo", JSON.stringify(data));
      setLoading(false);
      history.push("/chats");
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: error.response.data.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    }
  };
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  //handle click enter
  useEffect(() => {
    document.addEventListener("keydown", keyDown, true);

    return () => document.removeEventListener("keydown", keyDown, true);
  });
  const keyDown = (e) => {
    if (e.key === "Enter") {
      submitHandle();
    }
  };
  return (
    <VStack>
      <FormControl id="first-name" isRequired>
        <FormLabel>Name</FormLabel>
        <Input
          variant="flushed"
          size="lg"
          placeholder="Enter your username"
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
      </FormControl>

      <FormControl id="email" isRequired>
        <FormLabel>Email</FormLabel>
        <Input
          variant="flushed"
          size="lg"
          placeholder="Enter your email"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </FormControl>
      <FormControl id="password" isRequired>
        <FormLabel>Password</FormLabel>
        <InputGroup size="md">
          <Input
            type={show ? "text" : "password"}
            variant="flushed"
            size="lg"
            placeholder="Enter your password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleShow}>
              {show ? <ViewOffIcon color="#333" /> : <ViewIcon color="#333" />}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>
      <FormControl id="confirmpassword" isRequired>
        <FormLabel>Confirm password</FormLabel>
        <InputGroup size="md">
          <Input
            type={show ? "text" : "password"}
            variant="flushed"
            size="lg"
            placeholder="Enter your password"
            onChange={(e) => {
              setConfirmpassword(e.target.value);
            }}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleShow}>
              {show ? <ViewOffIcon color="#333" /> : <ViewIcon color="#333" />}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>
      <FormControl id="pic" isRequired>
        <FormLabel>Upload your avatar</FormLabel>
        <Input
          type="file"
          p={1.5}
          accept="image/*"
          // onChange={(e) => postDeltails(e.target.file[0])}
          onChange={(e) => postDetails(e.target.files[0])}
        />
      </FormControl>
      <Button
        bgColor="rgb(97,81,118)"
        color="white"
        width="30%"
        position="relative"
        left="35%"
        borderRadius="50px"
        boxShadow="md"
        style={{ marginTop: 15 }}
        onClick={submitHandle}
        isLoading={loading}
      >
        Sign up
      </Button>
    </VStack>
  );
};

export default Signup;
