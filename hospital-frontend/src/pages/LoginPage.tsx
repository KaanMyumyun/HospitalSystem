import { TextField, Button } from "@mui/material";
import { useState } from "react";
import { login, CreateUser } from "../api/authApi";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const result = await login({ name, password });

      if (!result.isSuccess) {
        console.log(result.error);
        return;
      }

      console.log("Token:", result.token);
      console.log("Role:", result.role);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const createUser = async () => {
    try {
      const result = await CreateUser({ name, password });

      if (!result.isSuccess) {
        console.log(result.error);
        return;
      }

      console.log("User created");
    } catch (error) {
      console.error("Create user failed:", error);
    }
  };
  

  return (
    <>
      <TextField
        margin="normal"
        required
        fullWidth
        id="name"
        label="Name"
        name="name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <TextField
        margin="normal"
        required
        fullWidth
        id="password"
        name="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button
        type="button"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        onClick={handleLogin}
      >
        Login
      </Button>

      <Button
        type="button"
        fullWidth
        variant="contained"
        sx={{ mt: 1, mb: 2 }}
        onClick={createUser}
      >
        Create User
      </Button>
    </>
  );
};

export default Login;
