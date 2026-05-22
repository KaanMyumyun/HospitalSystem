import { TextField, Button, Box, Typography, Divider } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LockIcon from "@mui/icons-material/Lock";
import { apiClient } from "@/api/apiClient";
import { login } from "@/api/Auth/login";

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
  <>
    <title>Hospital Management System - Login</title>

    <meta
      name="description"
      content="Secure login portal for the Hospital Management System."
    />

    <meta name="robots" content="index, follow" />

    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)",
        padding: 3,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "white",
          padding: 5,
          borderRadius: 4,
          boxShadow: "0 12px 35px rgba(0,0,0,0.12)",
        }}
      >
        {/* Logo + Lock Icon */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 3,
          }}
        >
          <Box
            sx={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(25,118,210,0.35)",
              marginBottom: 2,
            }}
          >
            <LockIcon sx={{ color: "white", fontSize: 34 }} />
          </Box>

          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: "#1565C0",
              marginBottom: 1,
              textAlign: "center",
            }}
          >
            Hospital Management System
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#666",
              textAlign: "center",
            }}
          >
            Secure staff login portal
          </Typography>
        </Box>

        {/* Username Field */}
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
              borderRadius: 2,
              backgroundColor: "#fafafa",
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
              borderRadius: 2,
              backgroundColor: "#fafafa",
            },
          }}
        />

        {/* Login Button */}
        <Button
          type="button"
          fullWidth
          variant="contained"
          onClick={handleLogin}
          sx={{
            padding: "14px",
            fontSize: "15px",
            fontWeight: 700,
            textTransform: "uppercase",
            background:
              "linear-gradient(135deg, #1976D2 0%, #2196F3 100%)",
            borderRadius: 2,
            marginBottom: 2,
            boxShadow: "0 6px 16px rgba(25,118,210,0.3)",
            "&:hover": {
              background:
                "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
            },
          }}
        >
          Login
        </Button>

        {/* Divider */}
        <Box sx={{ mt: 3, mb: 1 }}>
          <Divider sx={{ mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Portfolio Reviewer? Quick Access
            </Typography>
          </Divider>

          {/* Demo Buttons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={loginAsDemoAdmin}
              sx={{
                padding: "12px",
                borderRadius: 2,
                fontWeight: 600,
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
                padding: "12px",
                borderRadius: 2,
                fontWeight: 600,
                borderColor: "#2E7D32",
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

        {/* Footer */}
        <Typography
          variant="body2"
          sx={{
            textAlign: "center",
            marginTop: 4,
            color: "#777",
          }}
        >
          © 2025 Hospital Management System
        </Typography>
      </Box>
    </Box>
  </>
);
}