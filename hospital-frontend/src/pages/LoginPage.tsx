import { TextField, Button, Box, Typography, Divider } from "@mui/material";
import { useState } from "react";
import { login, CreateUser } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import { apiClient } from "@/api/apiClient";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // 1. Helper function to handle all logins (Real & Demo)
  const executeLogin = async (loginName: string, loginPass: string) => {
    try {
      const result = await login({ name: loginName, password: loginPass });
      if (!result.isSuccess || !result.token || !result.role) {
        console.log(result.error);
        return;
      }
      
      // Save credentials
      localStorage.setItem("token", result.token);
      localStorage.setItem("role", result.role);
      
      // Route based on role (Now handles Demo roles too!)
      if (result.role === "Admin" || result.role === "DemoAdmin") {
        navigate("/admin");
      } else if (result.role === "FrontDesk" || result.role === "DemoFrontDesk") {
        navigate("/receptiondashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Standard Login (Triggered by main login button)
  const handleLogin = () => {
    executeLogin(name, password);
  };

  // 2. One-Click Demo Login Handlers
  const loginAsDemoAdmin = () => {
    executeLogin("DemoAdmin", "12345678");
  };

  const loginAsDemoReception = () => {
    executeLogin("DemoReception", "12345678");
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

        {/* Username/Email Field */}
        <TextField
          margin="normal"
          required
          fullWidth
          id="name"
          label="Username"
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

        {/* Standard Login Button */}
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
         
      <Box sx={{ mt: 3, mb: 1 }}>
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Portfolio Reviewer? 1-Click Login
            </Typography>
          </Divider>
          
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={loginAsDemoAdmin}
              sx={{
                padding: "10px",
                borderColor: "#1976D2",
                color: "#1976D2",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.04)",
                  borderColor: "#1565C0",
                },
              }}
            >
               Login as Demo Admin
            </Button>
            
            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={loginAsDemoReception}
              sx={{
                padding: "10px",
                borderColor: "#2E7D32", // Green tint to separate from admin
                color: "#2E7D32",
                "&:hover": {
                  backgroundColor: "rgba(46, 125, 50, 0.04)",
                  borderColor: "#1B5E20",
                },
              }}
            >
               Login as Demo Reception
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
    
  );
};

export default Login;