import {
  Container,
  Box,
  Text,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import React, { useEffect } from "react";
import Login from "../components/Authentication/login";
import Signup from "../components/Authentication/signup";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));

    if (user) {
      navigate("/chats");
    }
  }, [navigate]);
  return (
    <Container maxW="xl" w={{ base: "150%" }} p={0} centerContents>
      <Box
        display="flex"
        justifyContent="center"
        p={3}
        w="100%"
        m={{ sm: "80px 0 15px 0", base: "5px 0 5px 0" }}
        borderRadius={{ base: "none", sm: "lg" }}
        color="white"
        boxShadow="dark-lg"
        style={{ backgroundImage: "transparent", backdropFilter: "blur(10px)" }}
      >
        <Text fontFamily="Amatic SC" fontSize="5xl">
          Chat app by Luan Thanh
        </Text>
      </Box>
      <Box
        color="black"
        p={{ base: "30px 0 0 10px", sm: 4 }}
        backgroundRadius="lg"
        borderRadius={{ base: "none", sm: "lg" }}
        boxShadow="dark-lg"
        h={{ sm: "74%", md: "690px", base: "81%" }}
        style={{
          backgroundImage: "transparent",
          backdropFilter: "blur(10px)",
        }}
      >
        <Tabs variant="unstyled">
          <TabList
            mb={{ sm: "0", md: "6rem" }}
            width="180px"
            color="#333"
            className="tab-list"
            bgColor="white"
            borderRadius="50px"
            boxShadow="md"
            position="relative"
            left={{ sm: "62%", base: 0 }}
          >
            <Tab
              width="50%"
              borderLeftRadius="50px"
              _selected={{ color: "white", bg: "rgb(231,194,189)" }}
            >
              Login
            </Tab>
            <Tab
              width="50%"
              borderRightRadius="50px"
              _selected={{ color: "white", bg: "rgb(231,194,189)" }}
            >
              Sign up
            </Tab>
          </TabList>
          <TabPanels color="#fff">
            <TabPanel>
              <Login />
            </TabPanel>
            <TabPanel>
              <Signup />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
};

export default HomePage;
