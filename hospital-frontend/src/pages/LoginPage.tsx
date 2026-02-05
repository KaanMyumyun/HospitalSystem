import { TextField, Button, Box, Typography } from "@mui/material";
import { useState } from "react";
import { login, CreateUser } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const result = await login({ name, password });
      if (!result.isSuccess || !result.token || !result.role) {
        console.log(result.error);
        return;
      }
      localStorage.setItem("token", result.token);
      localStorage.setItem("role", result.role);
      if (result.role === "Admin") {
        navigate("/admin");
      } else if(result.role ==="FrontDesk") {
        navigate("/receptiondashboard");
      }else{
        navigate("/")
      }
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: 3,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "white",
          padding: 4,
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {/* Lock Icon */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 2,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#2196F3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LockIcon sx={{ color: "white", fontSize: 28 }} />
          </Box>
        </Box>

        {/* Login Title */}
        <Typography
          variant="h5"
          component="h1"
          sx={{
            textAlign: "center",
            marginBottom: 3,
            fontWeight: 400,
            color: "#333",
          }}
        >
          Login
        </Typography>

        {/* Email Address Field */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label="Email Address"
          name="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{
            marginBottom: 2,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white",
            },
          }}
        />

        {/* Password Field */}
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
          sx={{
            marginBottom: 3,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white",
            },
          }}
        />

        <Button
          type="button"
          fullWidth
          variant="contained"
          onClick={handleLogin}
          sx={{
            padding: "12px",
            fontSize: "15px",
            fontWeight: 500,
            textTransform: "uppercase",
            backgroundColor: "#1976D2",
            marginBottom: 2,
            "&:hover": {
              backgroundColor: "#1565C0",
            },
          }}
        >
          Login
        </Button>

        <Button
          type="button"
          fullWidth
          variant="contained"
          onClick={createUser}
          sx={{
            padding: "12px",
            fontSize: "15px",
            fontWeight: 500,
            textTransform: "uppercase",
            backgroundColor: "#1976D2",
            marginBottom: 2,
            "&:hover": {
              backgroundColor: "#1565C0",
            },
          }}
        >
          Create User
        </Button>


         
      </Box>
    </Box>
  );
};

export default Login;