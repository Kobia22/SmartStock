package com.kobia.smartstock.controller;

import com.kobia.smartstock.config.JwtUtil;
import com.kobia.smartstock.entity.User;
import com.kobia.smartstock.entity.UserRequest;
import com.kobia.smartstock.repository.UserRepository;
import com.kobia.smartstock.repository.UserRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserRepository userRepository;
    private final UserRequestRepository userRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserController(UserRepository userRepository, UserRequestRepository userRequestRepository,
                          PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.userRequestRepository = userRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            logger.warn("Registration failed: Username {} already exists", user.getUsername());
            return ResponseEntity.badRequest().body("Username already exists!");
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            logger.warn("Registration failed: Email {} already exists", user.getEmail());
            return ResponseEntity.badRequest().body("Email already exists!");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
        logger.info("User registered: {}", user.getUsername());
        return ResponseEntity.ok("User registered successfully!");
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            logger.warn("Login failed for user: {}", username);
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.getPermissions().stream()
                        .map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                        .collect(Collectors.toList())
        );
        String token = jwtUtil.generateToken(userDetails);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Login successful!");
        response.put("token", token);
        response.put("permissions", user.getPermissions());
        logger.info("User logged in: {}", username);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/submit-request")
    @PreAuthorize("hasAnyAuthority('CREATE_USER_REQUEST', 'DELETE_USER_REQUEST')")
    public ResponseEntity<String> submitRequest(@RequestBody UserRequest request, Authentication auth) {
        User requester = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getRequestType().equals("CREATE") && !auth.getAuthorities().contains(new org.springframework.security.core.authority.SimpleGrantedAuthority("CREATE_USER_REQUEST"))) {
            return ResponseEntity.status(403).body("Permission denied");
        }
        if (request.getRequestType().equals("DELETE") && !auth.getAuthorities().contains(new org.springframework.security.core.authority.SimpleGrantedAuthority("DELETE_USER_REQUEST"))) {
            return ResponseEntity.status(403).body("Permission denied");
        }

        request.setCreatedBy(requester);
        request.setStatus("PENDING");
        userRequestRepository.save(request);
        return ResponseEntity.ok("Request submitted successfully!");
    }

    @PostMapping("/admin/approve-request/{requestId}")
    @PreAuthorize("hasAnyAuthority('APPROVE_USER_CREATION', 'APPROVE_USER_DELETION')")
    public ResponseEntity<String> approveRequest(@PathVariable Long requestId, @RequestBody Map<String, String> action, Authentication auth) {
        User approver = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        UserRequest request = userRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (request.getRequestType().equals("CREATE") && !auth.getAuthorities().contains(new org.springframework.security.core.authority.SimpleGrantedAuthority("APPROVE_USER_CREATION"))) {
            return ResponseEntity.status(403).body("Permission denied");
        }
        if (request.getRequestType().equals("DELETE") && !auth.getAuthorities().contains(new org.springframework.security.core.authority.SimpleGrantedAuthority("APPROVE_USER_DELETION"))) {
            return ResponseEntity.status(403).body("Permission denied");
        }

        String status = action.get("status");
        if (!status.equals("APPROVED") && !status.equals("REJECTED")) {
            return ResponseEntity.badRequest().body("Invalid status");
        }

        request.setStatus(status);
        request.setApprovedBy(approver);
        if (status.equals("APPROVED")) {
            if (request.getRequestType().equals("CREATE")) {
                User newUser = new User();
                newUser.setUsername(request.getTargetUsername());
                newUser.setEmail(request.getTargetEmail());
                newUser.setPassword(passwordEncoder.encode("Test123!")); // Default password
                userRepository.save(newUser);
            } else if (request.getRequestType().equals("DELETE")) {
                User user = userRepository.findByUsername(request.getTargetUsername())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                userRepository.delete(user);
            }
        }
        userRequestRepository.save(request);
        return ResponseEntity.ok("Request " + status.toLowerCase() + " successfully!");
    }

    @PostMapping("/admin/assign-permissions")
    @PreAuthorize("hasAuthority('ASSIGN_PERMISSION')")
    public ResponseEntity<String> assignPermissions(@RequestBody Map<String, Object> request, Authentication auth) {
        String targetUsername = (String) request.get("username");
        @SuppressWarnings("unchecked")
        List<String> permissionsToAdd = (List<String>) request.get("permissions");

        User targetUser = userRepository.findByUsername(targetUsername)
                .orElse(null);
        if (targetUser == null) {
            logger.warn("Permission assignment failed: User {} not found", targetUsername);
            return ResponseEntity.status(404).body("User not found");
        }

        if (permissionsToAdd.contains("ASSIGN_PERMISSION") && targetUsername.equals(auth.getName())) {
            logger.warn("User {} attempted to self-assign ASSIGN_PERMISSION", auth.getName());
            return ResponseEntity.status(403).body("Cannot assign ASSIGN_PERMISSION to self");
        }

        // FIX: Add new permissions to the existing ones instead of replacing them
        targetUser.getPermissions().addAll(permissionsToAdd);
        userRepository.save(targetUser);

        logger.info("Permissions assigned to {} by {}", targetUsername, auth.getName());
        return ResponseEntity.ok("Permissions assigned successfully!");
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAuthority('VIEW_USER_LIST')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/admin/requests")
    @PreAuthorize("hasAuthority('VIEW_REQUESTS')")
    public ResponseEntity<List<UserRequest>> getAllRequests() {
        return ResponseEntity.ok(userRequestRepository.findAll());
    }

    @GetMapping("/user/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getProfile(Authentication auth) {
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Map<String, Object> response = new HashMap<>();
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("permissions", user.getPermissions());
        return ResponseEntity.ok(response);
    }
}