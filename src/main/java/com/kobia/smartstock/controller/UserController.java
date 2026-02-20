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
    public ResponseEntity<?> register(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists!"));
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already exists!"));
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // STAGE 1: Lock the account in a quarantine state
        user.setPermissions(new HashSet<>(List.of("PENDING_APPROVAL")));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Request submitted successfully. Pending Manager approval."));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");
        User user = userRepository.findByUsername(username).orElse(null);

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }

        // PREVENT LOGIN IF IN QUARANTINE STATE
        if (user.getPermissions().contains("PENDING_APPROVAL")) {
            return ResponseEntity.status(401).body(Map.of("error", "Access Denied: Your account request is still pending approval by a Store Manager."));
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
        return ResponseEntity.ok(response);
    }

    // GET QUARANTINED USERS
    @GetMapping("/admin/pending-registrations")
    @PreAuthorize("hasAuthority('APPROVE_USER_CREATION')")
    public ResponseEntity<List<User>> getPendingRegistrations() {
        List<User> pending = userRepository.findAll().stream()
                .filter(u -> u.getPermissions().contains("PENDING_APPROVAL"))
                .collect(Collectors.toList());
        return ResponseEntity.ok(pending);
    }

    // STAGE 2: APPROVE OR DECLINE
    @PostMapping("/admin/process-registration/{username}")
    @PreAuthorize("hasAuthority('APPROVE_USER_CREATION')")
    public ResponseEntity<?> processRegistration(@PathVariable String username, @RequestBody Map<String, String> payload) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String action = payload.get("action");

        if ("APPROVE".equals(action)) {
            // Remove the lock. They now have 0 permissions and will see the blank lock screen
            user.getPermissions().remove("PENDING_APPROVAL");
            userRepository.save(user);
            return ResponseEntity.ok("User approved successfully. They currently have no roles assigned.");
        } else if ("DECLINE".equals(action)) {
            userRepository.delete(user);
            return ResponseEntity.ok("User registration declined and record deleted.");
        }

        return ResponseEntity.badRequest().body("Invalid action");
    }

    // STAGE 3: DYNAMICALLY ASSIGN/REMOVE ROLES
    @PostMapping("/admin/assign-permissions")
    @PreAuthorize("hasAuthority('ASSIGN_PERMISSION')")
    public ResponseEntity<String> assignPermissions(@RequestBody Map<String, Object> request, Authentication auth) {
        String targetUsername = (String) request.get("username");
        @SuppressWarnings("unchecked")
        List<String> permissionsToAdd = (List<String>) request.get("permissions");

        User targetUser = userRepository.findByUsername(targetUsername).orElse(null);
        if (targetUser == null) {
            return ResponseEntity.status(404).body("User not found");
        }

        if (permissionsToAdd.contains("ASSIGN_PERMISSION") && targetUsername.equals(auth.getName())) {
            return ResponseEntity.status(403).body("Cannot assign ASSIGN_PERMISSION to self");
        }

        // CLEAR AND OVERWRITE: Allows for both adding and removing permissions perfectly
        targetUser.getPermissions().clear();
        targetUser.getPermissions().addAll(permissionsToAdd);
        userRepository.save(targetUser);

        return ResponseEntity.ok("Permissions updated successfully!");
    }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAuthority('VIEW_USER_LIST')")
    public ResponseEntity<List<User>> getAllUsers() {
        // Only return users who are actually approved (not pending)
        List<User> activeUsers = userRepository.findAll().stream()
                .filter(u -> !u.getPermissions().contains("PENDING_APPROVAL"))
                .collect(Collectors.toList());
        return ResponseEntity.ok(activeUsers);
    }

    @PostMapping("/admin/submit-request")
    @PreAuthorize("hasAnyAuthority('CREATE_USER_REQUEST', 'DELETE_USER_REQUEST')")
    public ResponseEntity<String> submitRequest(@RequestBody UserRequest request, Authentication auth) {
        User requester = userRepository.findByUsername(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
        request.setCreatedBy(requester);
        request.setStatus("PENDING");
        userRequestRepository.save(request);
        return ResponseEntity.ok("Request submitted successfully!");
    }

    @PostMapping("/admin/approve-request/{requestId}")
    @PreAuthorize("hasAnyAuthority('APPROVE_USER_CREATION', 'APPROVE_USER_DELETION')")
    public ResponseEntity<String> approveRequest(@PathVariable Long requestId, @RequestBody Map<String, String> action, Authentication auth) {
        User approver = userRepository.findByUsername(auth.getName()).orElseThrow(() -> new RuntimeException("User not found"));
        UserRequest request = userRequestRepository.findById(requestId).orElseThrow(() -> new RuntimeException("Request not found"));

        String status = action.get("status");
        request.setStatus(status);
        request.setApprovedBy(approver);
        userRequestRepository.save(request);
        return ResponseEntity.ok("Request " + status.toLowerCase() + " successfully!");
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