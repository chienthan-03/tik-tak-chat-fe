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
import axios from "axios";
import { useToast } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { ViewIcon, ViewOffIcon } from "@chakra-ui/icons";

const Login = () => {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);
  const toast = useToast();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [loading, setLoading] = useState(false);

  const history = useHistory();

  const submitHandle = async () => {
    setLoading(true);
    if (!email || !password) {
      toast({
        title: "Please Fill all the Feilds",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    // console.log(email, password);
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
        },
      };

      const { data } = await axios.post(
        "https://tik-tak-chat-be.onrender.com/api/user/login",
        { email, password },
        config
      );

      // console.log(JSON.stringify(data));
      toast({
        title: "Login Successful",
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
    <VStack spacing={5} align="stretch">
      <FormControl
        id="email"
        marginTop={{ base: "60px", sm: "30px" }}
        isRequired
      >
        <FormLabel>Email</FormLabel>
        <Input
          value={email}
          variant="flushed"
          size="lg"
          type="email"
          placeholder="Enter your email"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </FormControl>
      <FormControl id="password" paddingTop="30px" isRequired>
        <FormLabel>Password</FormLabel>
        <InputGroup size="md">
          <Input
            value={password}
            size="lg"
            variant="flushed"
            type={show ? "text" : "password"}
            placeholder="Enter your password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <InputRightElement width="4.5rem">
            <Button h="1.75rem" size="sm" onClick={handleClick}>
              {show ? <ViewOffIcon color="#333" /> : <ViewIcon color="#333" />}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>
      <Button
        bgColor="rgb(97,81,118)"
        color="white"
        width="30%"
        position="relative"
        top={{ base: "120px", sm: "100px" }}
        left="70%"
        borderRadius="50px"
        boxShadow="md"
        style={{ marginTop: 15 }}
        onClick={submitHandle}
        isLoading={loading}
      >
        Log in
      </Button>
    </VStack>
  );
};

export default Login;
